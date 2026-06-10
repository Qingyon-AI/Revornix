from enums.section import UserSectionRole


def resolve_publish_action(*, status: bool, already_published: bool) -> str:
    if status and not already_published:
        return "create"
    if not status and already_published:
        return "delete"
    return "noop"


def resolve_subscribe_action(
    *,
    current_role: UserSectionRole | None,
    status: bool,
) -> str:
    if current_role is None:
        return "create" if status else "noop"

    if current_role == UserSectionRole.SUBSCRIBER:
        return "noop" if status else "delete"

    # creator/member: subscription status is implied by membership, no-op for both directions
    return "noop"
