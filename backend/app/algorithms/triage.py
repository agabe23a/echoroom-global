from datetime import datetime, timezone

def apply_zero_reply_algorithm(posts: list, user: dict) -> list:
    """
    Sorts the feed to prioritize unseen, unanswered Echoes for Campus Guardians.
    """
    # 1. If no user, or user is not a Guardian, return standard chronological feed
    if not user or user.get("empathy_score", 0) < 150:
        return sorted(posts, key=lambda x: x.get("created_at"), reverse=True)

    triage_posts = []
    standard_posts = []
    now = datetime.now(timezone.utc)

    for post in posts:
        post_time = post.get("created_at")
        
        # Ensure timezone awareness to prevent crashes
        if post_time.tzinfo is None:
            post_time = post_time.replace(tzinfo=timezone.utc)
            
        age_minutes = (now - post_time).total_seconds() / 60

        # TRIAGE CONDITION:
        # 1. It is an Echo (asking for help)
        # 2. It has exactly 0 replies
        # 3. It has been ignored for more than 15 minutes
        if post.get("post_type") == "echo" and len(post.get("replies", [])) == 0 and age_minutes > 15:
            post["is_triaged"] = True  # Flag for the frontend UI
            triage_posts.append(post)
        else:
            post["is_triaged"] = False
            standard_posts.append(post)

    # 2. Sort the Triage list so the OLDEST unanswered posts are at the very top (they waited longest)
    triage_posts = sorted(triage_posts, key=lambda x: x.get("created_at"), reverse=False)
    
    # 3. Sort the rest of the feed normally (newest first)
    standard_posts = sorted(standard_posts, key=lambda x: x.get("created_at"), reverse=True)

    # 4. Fuse them together
    return triage_posts + standard_posts