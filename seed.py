"""Seed initial CMS content into MongoDB. Idempotent: only seeds when collections empty."""
import os
import asyncio
from db import (
    admin_users, cms_content, stories_db, news_db, team_db, values_db,
    programme_db, fundraise_db, involvement_db, impact_db, site_settings,
)
from auth import hash_password
from models import new_id, now_iso


def _doc(**kwargs):
    return {'id': new_id(), 'created_at': now_iso(), **kwargs}


DEFAULT_STORIES = [
    {
        'key': 'aisha', 'name': 'Aisha', 'age': 19,
        'role': 'barista trainee at a local caf\u00e9',
        'quote': "Before SAM, I thought a job wasn't for someone like me. Now I make coffees for the whole street \u2014 and they all know my name.",
        'image': 'https://images.unsplash.com/photo-1768096043738-0675e58ddbdd?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
        'teller': "Aisha's mum, Naomi",
        'body': 'Aisha came to SAM for Life at 17 with a autism spectrum diagnosis and very little confidence. Today, Aisha works as a barista trainee at a local caf\u00e9, and is one of the brightest stars in our community.',
        'order': 1, 'published': True,
    },
    {
        'key': 'daniel', 'name': 'Daniel', 'age': 22,
        'role': 'warehouse assistant with a national retailer',
        'quote': 'I love work. I love my mates. I love payday. I am proud of me.',
        'image': 'https://images.unsplash.com/photo-1771054244002-4445dc1da2eb?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
        'teller': "Daniel's dad, Marcus",
        'body': 'Daniel came to SAM for Life at 20 with a Down syndrome diagnosis and very little confidence. Today, Daniel works as a warehouse assistant with a national retailer, and is one of the brightest stars in our community.',
        'order': 2, 'published': True,
    },
    {
        'key': 'priya', 'name': 'Priya', 'age': 17,
        'role': 'digital marketing apprentice',
        'quote': 'My coach told me my brain works differently \u2014 not less. That sentence changed my life.',
        'image': 'https://images.unsplash.com/photo-1593113565214-80afcb4dd192?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
        'teller': "Priya's foster carer, Eleanor",
        'body': 'Priya came to SAM for Life at 15 with a learning difference diagnosis and very little confidence. Today, Priya works as a digital marketing apprentice, and is one of the brightest stars in our community.',
        'order': 3, 'published': True,
    },
]

DEFAULT_NEWS = [
    {'date': '1 February 2026', 'tag': 'ANNOUNCEMENT', 'title': 'SAM for Life officially launches',
     'desc': 'After two years of pilot work, we are opening our doors to families and employer partners across the UK.', 'order': 1, 'published': True},
    {'date': '18 January 2026', 'tag': 'PARTNERSHIP', 'title': 'New partnership with The Daily Brew caf\u00e9 chain',
     'desc': 'Twelve new barista placement opportunities open this spring across London and Manchester.', 'order': 2, 'published': True},
    {'date': '12 December 2025', 'tag': 'RESEARCH', 'title': 'Research report: the cost of exclusion',
     'desc': 'Our first impact paper explores the lifelong economic and human cost of leaving young people behind.', 'order': 3, 'published': True},
]

DEFAULT_TEAM = [
    {'initials': 'SO', 'name': 'Samira Okafor', 'role': 'Founder & CEO', 'bio': 'A former SEND coordinator who saw too many young people fall through the cracks after school.', 'order': 1},
    {'initials': 'JW', 'name': 'James Whitfield', 'role': 'Programme Director', 'bio': 'Twenty years in supported employment. Believes ordinary jobs change extraordinary lives.', 'order': 2},
    {'initials': 'DLH', 'name': 'Dr Lara Henderson', 'role': 'Trustee, Clinical Lead', 'bio': 'Educational psychologist with a focus on neurodiversity and transition.', 'order': 3},
    {'initials': 'TA', 'name': 'Tunde Adeleke', 'role': 'Trustee, Employer Network', 'bio': 'Former HR director championing inclusive hiring across UK retail and hospitality.', 'order': 4},
]

DEFAULT_VALUES = [
    {'title': 'Dignity First', 'desc': 'We see the person, not the diagnosis. Every interaction starts with respect.', 'order': 1},
    {'title': 'Possibility Thinking', 'desc': 'We focus on what young people can do \u2014 and build everything from there.', 'order': 2},
    {'title': 'Partnership', 'desc': 'We work alongside families, schools, and employers as one team.', 'order': 3},
    {'title': 'Accountability', 'desc': 'We measure our impact in real outcomes \u2014 and share it openly.', 'order': 4},
]

DEFAULT_PROGRAMME = [
    {
        'key': 'skills-for-life', 'eyebrow': 'The foundation', 'title': 'Skills for Life',
        'desc': 'Practical workshops for young people aged 14\u201325 covering communication, digital literacy, money management, CV writing and emotional resilience.',
        'icon': 'graduation', 'image': 'https://images.unsplash.com/photo-1768096043738-0675e58ddbdd?crop=entropy&cs=srgb&fm=jpg&q=85&w=900',
        'bullets': ['Communication & social confidence', 'Digital literacy (email, basic computing, social media safety)', 'Money management & independence', 'CV writing & interview preparation', 'Emotional resilience & self-advocacy'],
        'order': 1,
    },
    {
        'key': 'work-pathways', 'eyebrow': 'Theory meets reality', 'title': 'Work Pathways',
        'desc': "Supported work placements tailored to each young person's strengths. A dedicated job coach accompanies every placement.",
        'icon': 'briefcase', 'image': 'https://images.unsplash.com/photo-1771054244002-4445dc1da2eb?crop=entropy&cs=srgb&fm=jpg&q=85&w=900',
        'bullets': [], 'order': 2,
    },
    {
        'key': 'employer-partners', 'eyebrow': 'Inclusive hiring, smart business', 'title': 'Employer Partners',
        'desc': 'We match you with the right young person, prepare your team, and stay close while the placement settles. You simply open the door.',
        'icon': 'building', 'image': 'https://images.unsplash.com/photo-1593113565214-80afcb4dd192?crop=entropy&cs=srgb&fm=jpg&q=85&w=900',
        'bullets': ['Higher team morale and retention', 'Improved customer relations and brand reputation', 'Fresh perspectives that drive innovation', 'Hands-on CSR with measurable, human outcomes'],
        'order': 3,
    },
]

DEFAULT_FUNDRAISE = [
    {'icon': 'footprints', 'title': 'Sponsored walk or run', 'desc': "Pull on your trainers and rally your friends. We'll send sponsorship forms and a SAM t-shirt.", 'order': 1},
    {'icon': 'cake', 'title': 'Bake sale or coffee morning', 'desc': 'A morning of cake, conversation, and quiet impact. Workplace-friendly and family-friendly.', 'order': 2},
    {'icon': 'bike', 'title': 'Cycle, swim or shave!', 'desc': "Big challenge, big difference. We'll help with social posts and a donation page.", 'order': 3},
    {'icon': 'sparkles', 'title': 'Celebrate in lieu of gifts', 'desc': 'Birthdays, weddings, milestones \u2014 ask loved ones to give in your name.', 'order': 4},
]

DEFAULT_INVOLVEMENT = [
    {'key': 'donate', 'icon': 'heart', 'title': 'Donate', 'desc': '\u00a325 funds one workshop. \u00a375 a month of coaching. \u00a3300 supports a full placement.', 'to': '/get-involved/donate', 'order': 1},
    {'key': 'volunteer', 'icon': 'users', 'title': 'Volunteer', 'desc': 'Mentor a young person, run a workshop, or coach in-placement. Apply online.', 'to': '/get-involved/volunteer', 'order': 2},
    {'key': 'partnership', 'icon': 'handshake', 'title': 'Corporate Partnership', 'desc': 'Host placements, run team volunteering days, and co-fundraise with us.', 'to': '/get-involved/partnership', 'order': 3},
    {'key': 'fundraise', 'icon': 'trophy', 'title': 'Fundraise', 'desc': "Run, bake, cycle or shave \u2014 your effort funds a young person's first job.", 'to': '/get-involved/fundraise', 'order': 4},
]

DEFAULT_IMPACT = [
    {'value': '1 in 5', 'text': 'young people with special needs finds paid employment without specialist support', 'order': 1},
    {'value': '3\u00d7', 'text': 'more likely our graduates are to gain meaningful work experience', 'order': 2},
    {'value': '100%', 'text': 'of families report improved confidence and independence', 'order': 3},
]

DEFAULT_SETTINGS = {
    'hero_badge': 'A UK charity for ability, not labels',
    'hero_headline_a': 'Every child deserves a',
    'hero_headline_b': 'future.',
    'hero_subheadline': 'SAM for Life empowers children with special needs to discover their abilities, build real-world skills, and step confidently into employment.',
    'hero_image': 'https://images.unsplash.com/photo-1709127347878-bd27e64d1e3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000',
    'mission_eyebrow': 'Our mission',
    'mission_title': 'A diagnosis is not a destination.',
    'mission_body': 'At SAM for Life, we believe every young person \u2014 regardless of their learning difference, physical challenge, or neurodiversity \u2014 carries unique strengths the world needs. We exist to find those strengths, nurture them, and open doors that might otherwise stay closed.',
    'impact_eyebrow': "The reality we're changing",
    'impact_title': 'Numbers that demand action.',
    'about_intro_eyebrow': 'About SAM for Life',
    'about_intro_title': "We don't manage potential. We unleash it.",
    'about_intro_body': 'SAM for Life was founded on a simple but powerful belief: that children with special needs are not problems to be managed \u2014 they are potential to be unleashed. Our mission is to bridge the gap between special education and meaningful employment, one young person at a time.',
    'mission_card_title': 'Why we exist',
    'mission_card_body': 'To bridge the gap between special education and meaningful employment \u2014 through specialist training, real workplaces, and a community that walks alongside every young person for life.',
    'vision_card_title': "Where we're going",
    'vision_card_body': 'A world where every young person with special needs has equal access to dignified, fulfilling work \u2014 chosen, not allocated.',
    'about_story_body': 'SAM for Life began with one teenager \u2014 Sam \u2014 who left specialist school with the brightest smile in the room and absolutely no route into the job he dreamed of.\n\nOur founder, an SEND coordinator at the time, refused to accept that "no route" was the end of the story. She started knocking on local employers\' doors. A bakery said yes. Then a bookshop. Then a national retailer.\n\nSam is twenty-four now and trains other young people on his team. SAM for Life is the charity built on what he taught us: that work isn\'t just about income \u2014 it\'s about identity, belonging, and the radical dignity of being needed.',
    'programme_intro_title': 'A journey from confidence to career.',
    'programme_intro_body': "We don't deliver a course \u2014 we walk a road. Three connected stages help every young person move from foundation skills to a real, fulfilling job.",
    'stories_intro_title': 'Stories that change everything.',
    'stories_intro_body': 'Behind every statistic is a young person, a family, and an employer who said yes. These are some of theirs.',
    'news_intro_title': "What's happening at SAM.",
    'news_intro_body': 'Partnership launches, programme updates, research, and chances to get involved.',
    'contact_intro_title': "We'd love to hear from you.",
    'contact_intro_body': "Whether you're a parent, a young person, an employer or a fellow charity \u2014 drop us a line and a real person will reply.",
    'get_involved_intro_title': "There's a place for you here.",
    'get_involved_intro_body': 'Whether you have five minutes, five pounds or five team members \u2014 every contribution moves a young person closer to their first paycheque.',
    'donate_intro_title': 'Your gift changes futures.',
    'donate_intro_body': 'Every pound supports the journey of a young person with special needs into meaningful work. Donations are processed securely by Stripe.',
    'volunteer_intro_title': 'Walk alongside a young person.',
    'volunteer_intro_body': "From facilitating a workshop to mentoring one-to-one or coaching during a placement \u2014 we'll match you to a role that fits your skills, your time, and your heart.",
    'partnership_intro_title': 'Inclusive hiring is smart business.',
    'partnership_intro_body': 'Our employer partners report higher team morale, improved customer relations, and fresh perspectives. We handle matching, preparation and ongoing support \u2014 you simply open the door.',
    'fundraise_intro_title': 'Run, bake, ride \u2014 and change a life.',
    'fundraise_intro_body': "Every pound you raise funds another step toward employment for a young person with special needs. Pick an idea \u2014 or invent your own \u2014 and we'll cheer you on the whole way.",
    'support_strip_title': '\u00a325 funds one workshop. \u00a375 a month of coaching. \u00a3300 changes one life.',
    'footer_tagline': 'Empowering children with special needs to discover their abilities and step into employment with confidence.',
    'footer_email': 'hello@samforlife.org',
    'footer_phone': '+44 20 0000 0000',
    'footer_location': 'United Kingdom',
    'footer_copyright': '\u00a9 2026 SAM for Life. Registered charity (pending).',
    'social_facebook': '#',
    'social_instagram': '#',
    'social_linkedin': '#',
}


async def seed_collection(col, data):
    count = await col.count_documents({})
    if count == 0 and data:
        docs = [_doc(**d) for d in data]
        await col.insert_many(docs)
        return len(docs)
    return 0


async def seed_settings():
    existing = await site_settings.find_one({'_singleton': True})
    if not existing:
        await site_settings.insert_one({'_singleton': True, **DEFAULT_SETTINGS, 'updated_at': now_iso()})
        return True
    return False


async def seed_admin():
    email = os.environ.get('ADMIN_EMAIL', 'admin@samforlife.org')
    password = os.environ.get('ADMIN_PASSWORD', 'sam-admin-2026')
    existing = await admin_users.find_one({'email': email})
    if not existing:
        await admin_users.insert_one({
            'id': new_id(),
            'email': email,
            'name': 'Admin',
            'password_hash': hash_password(password),
            'created_at': now_iso(),
        })
        return True
    return False


async def run_seed():
    s1 = await seed_collection(stories_db, DEFAULT_STORIES)
    s2 = await seed_collection(news_db, DEFAULT_NEWS)
    s3 = await seed_collection(team_db, DEFAULT_TEAM)
    s4 = await seed_collection(values_db, DEFAULT_VALUES)
    s5 = await seed_collection(programme_db, DEFAULT_PROGRAMME)
    s6 = await seed_collection(fundraise_db, DEFAULT_FUNDRAISE)
    s7 = await seed_collection(involvement_db, DEFAULT_INVOLVEMENT)
    s8 = await seed_collection(impact_db, DEFAULT_IMPACT)
    s9 = await seed_settings()
    s10 = await seed_admin()
    return {
        'stories': s1, 'news': s2, 'team': s3, 'values': s4,
        'programme': s5, 'fundraise': s6, 'involvement': s7,
        'impact': s8, 'settings_seeded': s9, 'admin_seeded': s10,
    }


if __name__ == '__main__':
    asyncio.run(run_seed())
