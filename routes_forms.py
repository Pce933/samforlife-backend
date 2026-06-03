from fastapi import APIRouter, HTTPException, Depends
from models import ContactCreate, VolunteerCreate, PartnershipCreate, NewsletterCreate, FundraiseIdeaCreate, new_id, now_iso
from db import contact_submissions, volunteer_applications, partnership_inquiries, newsletter_subscribers, fundraise_ideas_db
from auth import require_admin

router = APIRouter(prefix='/api/forms', tags=['forms'])


def _clean(d):
    d.pop('_id', None)
    return d


@router.post('/contact')
async def submit_contact(payload: ContactCreate):
    doc = {'id': new_id(), 'created_at': now_iso(), 'status': 'new', **payload.model_dump()}
    await contact_submissions.insert_one(doc)
    return {'ok': True, 'id': doc['id']}


@router.post('/volunteer')
async def submit_volunteer(payload: VolunteerCreate):
    doc = {'id': new_id(), 'created_at': now_iso(), 'status': 'new', **payload.model_dump()}
    await volunteer_applications.insert_one(doc)
    return {'ok': True, 'id': doc['id']}


@router.post('/partnership')
async def submit_partnership(payload: PartnershipCreate):
    doc = {'id': new_id(), 'created_at': now_iso(), 'status': 'new', **payload.model_dump()}
    await partnership_inquiries.insert_one(doc)
    return {'ok': True, 'id': doc['id']}


@router.post('/newsletter')
async def submit_newsletter(payload: NewsletterCreate):
    existing = await newsletter_subscribers.find_one({'email': payload.email.lower()})
    if existing:
        return {'ok': True, 'already': True}
    doc = {'id': new_id(), 'created_at': now_iso(), 'email': payload.email.lower(), 'active': True}
    await newsletter_subscribers.insert_one(doc)
    return {'ok': True, 'id': doc['id']}


@router.post('/fundraise-idea')
async def submit_fundraise_idea(payload: FundraiseIdeaCreate):
    doc = {'id': new_id(), 'created_at': now_iso(), 'status': 'new', **payload.model_dump()}
    await fundraise_ideas_db.insert_one(doc)
    return {'ok': True, 'id': doc['id']}


# ===== Admin read endpoints =====

@router.get('/admin/all')
async def admin_all_forms(_admin=Depends(require_admin)):
    async def fetch(col):
        items = await col.find().sort('created_at', -1).to_list(500)
        return [_clean(i) for i in items]

    return {
        'contact': await fetch(contact_submissions),
        'volunteer': await fetch(volunteer_applications),
        'partnership': await fetch(partnership_inquiries),
        'newsletter': await fetch(newsletter_subscribers),
        'fundraise_idea': await fetch(fundraise_ideas_db),
    }


@router.delete('/admin/{collection}/{item_id}')
async def admin_delete_form(collection: str, item_id: str, _admin=Depends(require_admin)):
    col_map = {
        'contact': contact_submissions,
        'volunteer': volunteer_applications,
        'partnership': partnership_inquiries,
        'newsletter': newsletter_subscribers,
        'fundraise_idea': fundraise_ideas_db,
    }
    col = col_map.get(collection)
    if col is None:
        raise HTTPException(404, 'Unknown collection')
    res = await col.delete_one({'id': item_id})
    return {'ok': True, 'deleted': res.deleted_count}


@router.patch('/admin/{collection}/{item_id}/status')
async def admin_update_status(collection: str, item_id: str, payload: dict, _admin=Depends(require_admin)):
    status = payload.get('status', 'new')
    col_map = {
        'contact': contact_submissions,
        'volunteer': volunteer_applications,
        'partnership': partnership_inquiries,
        'fundraise_idea': fundraise_ideas_db,
    }
    col = col_map.get(collection)
    if col is None:
        raise HTTPException(404, 'Unknown collection')
    await col.update_one({'id': item_id}, {'$set': {'status': status, 'updated_at': now_iso()}})
    return {'ok': True}
