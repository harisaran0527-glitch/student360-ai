# Student360 AI — Supervised Machine Learning Pipeline Specification & Workflow

## Overview

This directory provides the optional, ML-ready training pipeline architecture for Student360 AI. 

> [!IMPORTANT]
> **Current Application Status**: The core Next.js application operates using **Rule-Based Engine v1.0** (`src/lib/ai/`). The web application runs completely independently without requiring Python services or external AI APIs.

This `ml/` repository structure is prepared for future phases when an institution accumulates sufficient **real, labelled historical student records** across multiple academic years.

---

## Required Historical Institutional Dataset Schema

To train a true supervised machine learning model (e.g. for predicting long-term academic support intervention), the dataset must be collected over multiple completed academic batches.

### Feature Inputs (X):
1. `overall_attendance_percentage`: Float (0.0 - 100.0)
2. `subject_shortages_count`: Integer (number of courses with attendance < 75%)
3. `cgpa`: Float (0.0 - 10.0)
4. `sgpa_trend`: Float (change in SGPA over previous 2 semesters)
5. `current_semester`: Integer (1 - 8)
6. `semester_internship_required`: Binary (0 or 1)
7. `internship_completed`: Binary (0 or 1)
8. `pending_compliance_docs`: Integer (number of unverified/pending documents)
9. `verified_skills_count`: Integer
10. `verified_projects_count`: Integer
11. `verified_certificates_count`: Integer

### Target Label (y):
- `support_intervention_required`: Binary (1 if the student required documented academic/administrative intervention, 0 otherwise).

### Explicitly Excluded Features (Data Privacy & Fairness):
- Aadhaar number
- Gender
- Religion / Caste / Community
- Financial / Income status
- Parent / Guardian contact or occupation
- Home address / Pincode
- Blood group
- Admission quota / Residence type

---

## Pipeline Workflow

1. **Feature Extraction (`feature_extraction.py`)**: Loads raw JSON/CSV institutional logs and constructs sanitized feature vectors.
2. **Model Training (`training_template.py`)**: Implements standard sklearn classifiers (Logistic Regression, Decision Tree, Random Forest) with standard scaling and k-fold cross-validation.
3. **Evaluation (`evaluation_template.py`)**: Evaluates performance using Accuracy, Precision, Recall, F1-Score, and Confusion Matrix.

---

## Environment Setup

```bash
cd ml
pip install -r requirements.txt
python feature_extraction.py
python training_template.py
```
