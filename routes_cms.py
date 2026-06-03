from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import (
    StoryModel, NewsItemModel, TeamMemberModel, ValueModel,
    ProgrammeStepModel, FundraiseIdeaModel, InvolvementCardModel,
    ImpactStatModel, SiteSettingsModel, new_id, now_iso
)
from db import (
    stories_db, news_db, team_db, values_db, programme_db,
    fundraise_db, involvement_db, impact_db, site_settings,
)
from auth import require_admin

router = APIRouter(prefix='/api/cms', tags=['cms'])


def _clean(d):
    if d:
        d.pop('_id', None)
    return d


async def _list(col, sort_by='order'):
    items = await col.find().sort(sort_by, 1).to_list(500)
    return [_clean(i) for i in items]


async def _public_list(col):
    items = await col.find({'$or': [{'published': True}, {'published': {'$exists': False}}]}).sort('order', 1).to_list(500)
    return [_clean(i) for i in items]


# ===== PUBLIC: read-only endpoint for the website =====

@router.get('/all')
async def get_all_content():
    settings = await site_settings.find_one({'_singleton': True}) or {}
    settings.pop('_id', None)
    settings.pop('_singleton', None)
    return {
        'settings': settings,
        'stories': await _public_list(stories_db),
        'news': await _public_list(news_db),
        'team': await _list(team_db),
        'values': await _list(values_db),
        'programme': await _list(programme_db),
        'fundraise_ideas': await _list(fundraise_db),
        'involvement': await _list(involvement_db),
        'impact_stats': await _list(impact_db),
    }


# ===== ADMIN: settings =====

@router.get('/admin/settings')
async def admin_get_settings(_admin=Depends(require_admin)):
    settings = await site_settings.find_one({'_singleton': True}) or {}
    settings.pop('_id', None)
    return settings


@router.put('/admin/settings')
async def admin_update_settings(payload: SiteSettingsModel, _admin=Depends(require_admin)):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    data['updated_at'] = now_iso()
    await site_settings.update_one({'_singleton': True}, {'$set': data}, upsert=True)
    out = await site_settings.find_one({'_singleton': True})
    out.pop('_id', None)
    return out


# Generic CRUD factory for list collections

def _make_crud(prefix: str, col, model_cls):
    sub = APIRouter()

    @sub.get(f'/admin/{prefix}')
    async def list_items(_admin=Depends(require_admin)):
        return await _list(col)

    @sub.post(f'/admin/{prefix}')
    async def create_item(payload: model_cls, _admin=Depends(require_admin)):
        doc = payload.model_dump()
        doc['id'] = new_id()
        doc['created_at'] = now_iso()
        await col.insert_one(doc)
        doc.pop('_id', None)
        return doc

    @sub.put(f'/admin/{prefix}/{{item_id}}')
    async def update_item(item_id: str, payload: model_cls, _admin=Depends(require_admin)):
        data = payload.model_dump()
        data.pop('id', None)
        data['updated_at'] = now_iso()
        res = await col.update_one({'id': item_id}, {'$set': data})
        if res.matched_count == 0:
            raise HTTPException(404, 'Not found')
        out = await col.find_one({'id': item_id})
        out.pop('_id', None)
        return out

    @sub.delete(f'/admin/{prefix}/{{item_id}}')
    async def delete_item(item_id: str, _admin=Depends(require_admin)):
        res = await col.delete_one({'id': item_id})
        if res.deleted_count == 0:
            raise HTTPException(404, 'Not found')
        return {'ok': True}

    return sub


router.include_router(_make_crud('stories', stories_db, StoryModel))
router.include_router(_make_crud('news', news_db, NewsItemModel))
router.include_router(_make_crud('team', team_db, TeamMemberModel))
router.include_router(_make_crud('values', values_db, ValueModel))
router.include_router(_make_crud('programme', programme_db, ProgrammeStepModel))
router.include_router(_make_crud('fundraise', fundraise_db, FundraiseIdeaModel))
router.include_router(_make_crud('involvement', involvement_db, InvolvementCardModel))
router.include_router(_make_crud('impact', impact_db, ImpactStatModel))
