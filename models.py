from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


# ===== Form submissions =====

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=300)
    message: str = Field(..., min_length=1, max_length=5000)


class VolunteerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = None
    skills: str = Field(..., min_length=1, max_length=1000)
    availability: str = Field(..., min_length=1, max_length=500)
    why: Optional[str] = Field(None, max_length=2000)


class PartnershipCreate(BaseModel):
    company: str = Field(..., min_length=1, max_length=200)
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = None
    interest: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=3000)


class NewsletterCreate(BaseModel):
    email: EmailStr


class FundraiseIdeaCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    idea: str = Field(..., min_length=1, max_length=2000)


# ===== Payments =====

class CheckoutCreate(BaseModel):
    package_id: Optional[str] = None   # one of: '25', '75', '300'
    custom_amount: Optional[float] = None
    frequency: str = Field('one-time')  # 'one-time' or 'monthly'
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    origin_url: str


# ===== Auth =====

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ===== CMS =====

class StoryModel(BaseModel):
    id: Optional[str] = None
    key: str
    name: str
    age: int
    role: str
    quote: str
    image: str
    teller: str
    body: str
    order: int = 0
    published: bool = True


class NewsItemModel(BaseModel):
    id: Optional[str] = None
    date: str
    tag: str
    title: str
    desc: str
    order: int = 0
    published: bool = True


class TeamMemberModel(BaseModel):
    id: Optional[str] = None
    initials: str
    name: str
    role: str
    bio: str
    order: int = 0


class ValueModel(BaseModel):
    id: Optional[str] = None
    title: str
    desc: str
    order: int = 0


class ProgrammeStepModel(BaseModel):
    id: Optional[str] = None
    key: str
    eyebrow: str
    title: str
    desc: str
    icon: str
    image: str
    bullets: List[str] = []
    order: int = 0


class FundraiseIdeaModel(BaseModel):
    id: Optional[str] = None
    icon: str
    title: str
    desc: str
    order: int = 0


class InvolvementCardModel(BaseModel):
    id: Optional[str] = None
    key: str
    icon: str
    title: str
    desc: str
    to: str
    order: int = 0


class ImpactStatModel(BaseModel):
    id: Optional[str] = None
    value: str
    text: str
    order: int = 0


class SiteSettingsModel(BaseModel):
    hero_badge: Optional[str] = None
    hero_headline_a: Optional[str] = None
    hero_headline_b: Optional[str] = None
    hero_subheadline: Optional[str] = None
    hero_image: Optional[str] = None
    mission_eyebrow: Optional[str] = None
    mission_title: Optional[str] = None
    mission_body: Optional[str] = None
    impact_eyebrow: Optional[str] = None
    impact_title: Optional[str] = None
    about_intro_eyebrow: Optional[str] = None
    about_intro_title: Optional[str] = None
    about_intro_body: Optional[str] = None
    mission_card_title: Optional[str] = None
    mission_card_body: Optional[str] = None
    vision_card_title: Optional[str] = None
    vision_card_body: Optional[str] = None
    about_story_body: Optional[str] = None  # paragraphs separated by \n\n
    programme_intro_title: Optional[str] = None
    programme_intro_body: Optional[str] = None
    stories_intro_title: Optional[str] = None
    stories_intro_body: Optional[str] = None
    news_intro_title: Optional[str] = None
    news_intro_body: Optional[str] = None
    contact_intro_title: Optional[str] = None
    contact_intro_body: Optional[str] = None
    get_involved_intro_title: Optional[str] = None
    get_involved_intro_body: Optional[str] = None
    donate_intro_title: Optional[str] = None
    donate_intro_body: Optional[str] = None
    volunteer_intro_title: Optional[str] = None
    volunteer_intro_body: Optional[str] = None
    partnership_intro_title: Optional[str] = None
    partnership_intro_body: Optional[str] = None
    fundraise_intro_title: Optional[str] = None
    fundraise_intro_body: Optional[str] = None
    support_strip_title: Optional[str] = None
    footer_tagline: Optional[str] = None
    footer_email: Optional[str] = None
    footer_phone: Optional[str] = None
    footer_location: Optional[str] = None
    footer_copyright: Optional[str] = None
    social_facebook: Optional[str] = None
    social_instagram: Optional[str] = None
    social_linkedin: Optional[str] = None
