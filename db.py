import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class MockCursor:
    def __init__(self, items):
        self.items = items

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            key = key_or_list[0][0]
            reverse = key_or_list[0][1] == -1
        else:
            key = key_or_list
            reverse = direction == -1

        def get_val(item):
            val = item.get(key)
            if val is None:
                return (0, "")
            if isinstance(val, (int, float)):
                return (1, val)
            return (2, str(val))

        self.items.sort(key=get_val, reverse=reverse)
        return self

    async def to_list(self, length=None):
        if length is not None:
            return self.items[:length]
        return self.items

class MockUpdateResult:
    def __init__(self, matched_count, modified_count):
        self.matched_count = matched_count
        self.modified_count = modified_count

class MockDeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count

class MockInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class MockCollection:
    def __init__(self, db_client, name):
        self.db_client = db_client
        self.name = name

    def _get_all(self):
        return self.db_client._load_data(self.name)

    def _save_all(self, items):
        self.db_client._save_data(self.name, items)

    def _matches(self, doc, filter):
        if not filter:
            return True
        for k, v in filter.items():
            if k == '$or':
                match_any = False
                for sub_filter in v:
                    if self._matches(doc, sub_filter):
                        match_any = True
                        break
                if not match_any:
                    return False
            elif isinstance(v, dict):
                if '$exists' in v:
                    exists = v['$exists']
                    has_key = k in doc
                    if has_key != exists:
                        return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    def find(self, filter=None, *args, **kwargs):
        all_items = self._get_all()
        matched = [doc for doc in all_items if self._matches(doc, filter)]
        return MockCursor(matched)

    async def find_one(self, filter=None, *args, **kwargs):
        all_items = self._get_all()
        for doc in all_items:
            if self._matches(doc, filter):
                return doc
        return None

    async def insert_one(self, document):
        if '_id' not in document:
            document['_id'] = str(len(self._get_all()) + 1)
        all_items = self._get_all()
        all_items.append(document)
        self._save_all(all_items)
        return MockInsertResult(document['_id'])

    async def insert_many(self, documents):
        all_items = self._get_all()
        for i, document in enumerate(documents):
            if '_id' not in document:
                document['_id'] = str(len(all_items) + 1 + i)
            all_items.append(document)
        self._save_all(all_items)
        return MockInsertResult(None)

    async def update_one(self, filter, update, upsert=False):
        all_items = self._get_all()
        matched_count = 0
        modified_count = 0
        set_dict = update.get('$set', {})
        
        for doc in all_items:
            if self._matches(doc, filter):
                matched_count += 1
                for k, v in set_dict.items():
                    doc[k] = v
                modified_count += 1
                break
                
        if matched_count == 0 and upsert:
            new_doc = {}
            if isinstance(filter, dict):
                for k, v in filter.items():
                    if not k.startswith('$'):
                        new_doc[k] = v
            for k, v in set_dict.items():
                new_doc[k] = v
            new_doc['_id'] = str(len(all_items) + 1)
            all_items.append(new_doc)
            matched_count = 1
            modified_count = 1
            
        self._save_all(all_items)
        return MockUpdateResult(matched_count, modified_count)

    async def delete_one(self, filter):
        all_items = self._get_all()
        deleted_count = 0
        new_items = []
        for doc in all_items:
            if self._matches(doc, filter) and deleted_count == 0:
                deleted_count += 1
            else:
                new_items.append(doc)
        self._save_all(new_items)
        return MockDeleteResult(deleted_count)

    async def count_documents(self, filter):
        all_items = self._get_all()
        matched = [doc for doc in all_items if self._matches(doc, filter)]
        return len(matched)

class MockAsyncIOMotorClient:
    def __init__(self):
        self.db_file = Path(__file__).parent / 'db.json'
        self._init_db_file()

    def _init_db_file(self):
        if not self.db_file.exists():
            with open(self.db_file, 'w', encoding='utf-8') as f:
                json.dump({}, f)

    def _load_data(self, collection_name):
        self._init_db_file()
        try:
            with open(self.db_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data.get(collection_name, [])
        except Exception:
            return []

    def _save_data(self, collection_name, items):
        self._init_db_file()
        try:
            with open(self.db_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            data = {}
        data[collection_name] = items
        with open(self.db_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def __getitem__(self, db_name):
        return self

    def __getattr__(self, name):
        return MockCollection(self, name)

    def close(self):
        pass

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'sam_for_life')

if MONGO_URL:
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
else:
    logger.warning("MONGO_URL not set in environment. Falling back to local JSON mock database client.")
    client = MockAsyncIOMotorClient()
    db = client


# Collections
contact_submissions = db.contact_submissions
volunteer_applications = db.volunteer_applications
partnership_inquiries = db.partnership_inquiries
newsletter_subscribers = db.newsletter_subscribers
fundraise_ideas_db = db.fundraise_idea_submissions
payment_transactions = db.payment_transactions
admin_users = db.admin_users
cms_content = db.cms_content
stories_db = db.stories
news_db = db.news
team_db = db.team
values_db = db.values
programme_db = db.programme_steps
fundraise_db = db.fundraise_ideas
involvement_db = db.involvement_cards
impact_db = db.impact_stats
site_settings = db.site_settings
