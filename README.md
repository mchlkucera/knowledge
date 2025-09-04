# Prompt Management System

Git-based system for managing AI prompts across companies and departments.

## Repository Structure

```
/
├── shared/                   # Shared templates and guidelines
├── TEMPLATE/                 # Templates for new companies
├── {company}/               # Company-specific prompts
│   └── {department}/        # Department-specific prompts
│       └── prompt-name.md   # Individual prompt files
└── README.md
```

## File Naming

**Format**: `prompt-name.md` (descriptive, kebab-case)

**Examples**: `review-request.md`, `escalation-response.md`, `code-review.md`

## File Structure

### YAML Frontmatter
```yaml
---
title: Human-readable title
company: Company name
department: Department name
tags: [tag1, tag2, tag3]
last_updated: YYYY-MM-DD
version: X.Y
shared_elements: [tone-of-voice, brand-guidelines, compliance]
---
```

### Content Structure
```markdown
# Prompt Title

## Context
When and why to use this prompt.

## Prompt
The actual AI prompt with variables and instructions.

## Variables
- {{variable_name}} - Description
- {{shared.tone_of_voice}} - Reference to shared template
```

## Variable System

**Standard Variables**: `{{company_name}}`, `{{department_name}}`, `{{user_name}}`, `{{current_date}}`

**Shared References**: `{{shared.tone_of_voice}}`, `{{shared.brand_guidelines}}`, `{{shared.compliance}}`

## Branching Strategy

- **`main`** - Production prompts (live in systems)
- **`dev`** - Drafts and prompts in review
- **`feature/*`** - Individual contributor branches

## Shared Elements

Shared templates in `/shared/` are referenced using `{{shared.template_name}}` variables for consistency across all prompts.

## Templates

Use `/TEMPLATE/` directory as starting point for new companies. Copy templates and customize with company-specific information.

## Getting Started

1. **Clone the repository**
2. **For new companies**: Copy from `/TEMPLATE/` and customize
3. **For new prompts**: Follow the file structure above
4. **Use pull requests** for all changes

Git is the single source of truth. All changes go through version control.
