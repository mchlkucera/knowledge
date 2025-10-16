---
title: Compliance Guidelines
type: shared_template
last_updated: 2025-01-27
version: 1.0
---

# Compliance Guidelines

## Legal Disclaimers

### General Disclaimer
"This information is provided for general guidance only and should not be considered as professional advice. Please consult with relevant experts for your specific situation."

### Data Privacy (GDPR/CCPA)
"We respect your privacy and handle your data in accordance with GDPR and CCPA regulations. You can update your preferences or unsubscribe at any time."

### Financial/Business Advice
"Results may vary. Past performance does not guarantee future results. Please consult with financial or business advisors for decisions specific to your situation."

## Email Marketing Compliance

### CAN-SPAM Requirements
- Include clear sender identification
- Use accurate subject lines
- Provide physical mailing address
- Include easy unsubscribe mechanism
- Honor opt-out requests within 10 business days

### GDPR Requirements
- Obtain explicit consent for data processing
- Provide clear privacy policy links
- Allow data portability and deletion requests
- Maintain records of consent

## Industry-Specific Compliance

### Healthcare (HIPAA)
- Never include protected health information (PHI) in prompts
- Use generic examples only
- Include HIPAA compliance disclaimers when relevant

### Financial Services
- Include appropriate risk disclosures
- Avoid providing specific financial advice
- Comply with relevant regulatory requirements (SEC, FINRA, etc.)

### Education (FERPA)
- Protect student privacy information
- Use anonymized examples only
- Include appropriate educational disclaimers

## Content Restrictions

### What to Avoid
- Making medical, legal, or financial claims
- Guaranteeing specific results or outcomes
- Using misleading or deceptive language
- Including copyrighted material without permission

### Required Elements
- Unsubscribe links in all marketing emails
- Privacy policy links
- Terms of service references
- Contact information

## Usage Variables

Customize compliance elements:
- `{{privacy_policy_url}}` - Link to company privacy policy
- `{{unsubscribe_url}}` - Unsubscribe mechanism
- `{{company_address}}` - Physical mailing address
- `{{compliance_contact}}` - Compliance officer contact
- `{{industry_specific_disclaimer}}` - Relevant industry disclaimers

## Templates

### Email Footer Compliance
```
{{company_name}}
{{company_address}}

Privacy Policy: {{privacy_policy_url}}
Unsubscribe: {{unsubscribe_url}}

© {{current_year}} {{company_name}}. All rights reserved.
```

### General Disclaimer Template
```
Disclaimer: {{industry_specific_disclaimer}}

For questions about this communication, contact: {{compliance_contact}}
```
