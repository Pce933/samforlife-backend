import os
from fastapi import APIRouter, HTTPException, Request, Depends
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)
from models import CheckoutCreate, new_id, now_iso
from db import payment_transactions
from auth import require_admin

router = APIRouter(prefix='/api/payments', tags=['payments'])

STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Fixed packages (defined ONLY in backend, never trust the frontend amount)
PACKAGES = {
    '25': 25.00,
    '75': 75.00,
    '300': 300.00,
}
MIN_CUSTOM = 1.0
MAX_CUSTOM = 100000.0


def _checkout_client(host_url: str) -> StripeCheckout:
    # Build webhook URL from request host
    webhook_url = host_url.rstrip('/') + '/api/webhook/stripe'
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@router.post('/checkout/session')
async def create_checkout_session(payload: CheckoutCreate, request: Request):
    # Determine amount on backend only
    if payload.package_id and payload.package_id in PACKAGES:
        amount = PACKAGES[payload.package_id]
    elif payload.custom_amount is not None:
        try:
            amount = float(payload.custom_amount)
        except Exception:
            raise HTTPException(400, 'Invalid custom amount')
        if amount < MIN_CUSTOM or amount > MAX_CUSTOM:
            raise HTTPException(400, f'Amount must be between {MIN_CUSTOM} and {MAX_CUSTOM}')
    else:
        raise HTTPException(400, 'Either package_id or custom_amount is required')

    if payload.frequency not in ('one-time', 'monthly'):
        raise HTTPException(400, 'Invalid frequency')

    origin = payload.origin_url.rstrip('/')
    success_url = f"{origin}/get-involved/donate?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/get-involved/donate?cancelled=1"

    metadata = {
        'amount_gbp': f"{amount:.2f}",
        'frequency': payload.frequency,
        'donor_name': payload.name or '',
        'donor_email': payload.email or '',
        'source': 'sam_for_life_donate',
    }

    host_url = str(request.base_url)
    checkout = _checkout_client(host_url)

    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency='gbp',
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    try:
        session = await checkout.create_checkout_session(checkout_request)
    except Exception as e:
        raise HTTPException(500, f'Stripe error: {str(e)}')

    # Store transaction record
    txn = {
        'id': new_id(),
        'session_id': session.session_id,
        'amount': amount,
        'currency': 'gbp',
        'frequency': payload.frequency,
        'donor_name': payload.name or '',
        'donor_email': payload.email or '',
        'metadata': metadata,
        'payment_status': 'initiated',
        'status': 'open',
        'created_at': now_iso(),
    }
    await payment_transactions.insert_one(txn)

    return {'url': session.url, 'session_id': session.session_id}


@router.get('/checkout/status/{session_id}')
async def get_checkout_status(session_id: str, request: Request):
    host_url = str(request.base_url)
    checkout = _checkout_client(host_url)

    try:
        status = await checkout.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(500, f'Stripe error: {str(e)}')

    existing = await payment_transactions.find_one({'session_id': session_id})
    if existing and existing.get('payment_status') == 'paid':
        # Already processed once
        return {
            'session_id': session_id,
            'status': existing.get('status'),
            'payment_status': existing.get('payment_status'),
            'amount_total': int(existing.get('amount', 0) * 100),
            'currency': existing.get('currency', 'gbp'),
            'already_processed': True,
        }

    # Update DB with latest status
    update_doc = {
        'status': status.status,
        'payment_status': status.payment_status,
        'updated_at': now_iso(),
    }
    await payment_transactions.update_one({'session_id': session_id}, {'$set': update_doc})

    return {
        'session_id': session_id,
        'status': status.status,
        'payment_status': status.payment_status,
        'amount_total': status.amount_total,
        'currency': status.currency,
        'metadata': status.metadata,
    }


@router.get('/admin/transactions')
async def admin_list_transactions(_admin=Depends(require_admin)):
    items = await payment_transactions.find().sort('created_at', -1).to_list(500)
    for it in items:
        it.pop('_id', None)
    return items


# Webhook endpoint (mounted at /api/webhook/stripe via dedicated app router)
webhook_router = APIRouter(tags=['payments'])


@webhook_router.post('/api/webhook/stripe')
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get('Stripe-Signature', '')
    host_url = str(request.base_url)
    checkout = _checkout_client(host_url)
    try:
        evt = await checkout.handle_webhook(body, signature)
    except Exception as e:
        raise HTTPException(400, f'Webhook error: {str(e)}')

    if evt and getattr(evt, 'session_id', None):
        await payment_transactions.update_one(
            {'session_id': evt.session_id},
            {'$set': {
                'payment_status': getattr(evt, 'payment_status', None),
                'last_webhook_event': getattr(evt, 'event_type', None),
                'updated_at': now_iso(),
            }}
        )
    return {'received': True}
