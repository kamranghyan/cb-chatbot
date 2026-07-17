"""Domain enums — old code ke bikhre enums ek jagah."""

from enum import Enum


class SecurityLevel(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    SECRET = "secret"

    def allowed_levels(self) -> list[str]:
        """Clearance hierarchy: secret wala private+public bhi dekh sakta hai.
        Old rag_query.py mein yeh logic inline bikhri hui thi."""
        order = [SecurityLevel.PUBLIC, SecurityLevel.PRIVATE, SecurityLevel.SECRET]
        return [lvl.value for lvl in order[: order.index(self) + 1]]


class IngestionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Channel(str, Enum):
    Web = "web"
    Mobile = "mobile"
    Whatsapp = "whatsapp"
    Alexa = "alexa"


class CategoryEnum(str, Enum):
    GENERAL = "General"
    ISSUES = "Issues"


class SubCategoryEnum(str, Enum):
    PACKAGING = "Packaging"
    PRODUCT_INFORMATION = "Product Information"
    QUALITY = "Quality"
    SMELL_OR_ODOR = "Smell or Odor"
    WEIGHT = "Weight"
    FOREIGN_MATTER = "Foreign Matter"
    INSECTS = "Insects"
    MICROORGANISM = "Microorganism"
    ALLERGIES_OTHER = "Allergies - Other"
    COMPLIMENTS_OTHER = "Compliments - Other"
    COUPONS_OTHER = "Coupons - Other"
    DAMAGE_OTHER = "Damage - Other"
    DIRECTIONS_MISPRINT_OTHER = "Directions Misprint - Other"
    DISPLEASED_OTHER = "Displeased - Other"
    RECIPES_OTHER = "Recipes - Other"
    OTHER_DEPARTMENT_OTHER = "Other Department - Other"
    ILLNESS_OTHER = "Illness - Other"
    LEGAL_OTHER = "Legal - Other"


class RoleId:
    """Old code mein magic numbers (role_id == 1 or 3) — ab named constants."""

    ADMIN = 1
    SUPER_ADMIN = 3