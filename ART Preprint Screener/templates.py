"""Author-facing rejection messages. OSF emails the selected text to the submitter.

Claude never writes author-facing text; it only chooses which of these applies.
"""

OUT_OF_SCOPE = (
    "Thank you for your submission. The Accounting Research & Thought preprint server "
    "is narrowly focused on accounting research."
)

INSUFFICIENT_CONTRIBUTION = (
    "Thank you for your submission. After review, this manuscript does not make a "
    "sufficient contribution to the accounting literature to be posted on the "
    "Accounting Research & Thought preprint server."
)

REDIRECT = (
    "Thank you for your interest in Accounting Research & Thought. The OSF preprint "
    "server is not ART's submission channel, so this preprint has not been posted. "
    "For information on submitting a manuscript for review, please visit the ART page: "
    "https://culverhouse.ua.edu/accounting/accounting-research-thought/"
)

REJECTION_MESSAGES = {
    "out_of_scope": OUT_OF_SCOPE,
    "insufficient_contribution": INSUFFICIENT_CONTRIBUTION,
    "redirect": REDIRECT,
}
