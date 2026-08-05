"""
Student360 AI — Feature Extraction Script
Transforms raw student records into sanitized numerical vectors for ML training.
Excludes all sensitive demographic fields (Aadhaar, address, parents, religion, caste, gender, etc.).
"""

import json
import pandas as pd
import numpy as np

def extract_features_from_records(records):
    """
    Extracts numerical features from student profile dictionary records.
    """
    feature_list = []
    labels = []

    for r in records:
        feat = {
            "overall_attendance_percentage": float(r.get("attendancePercentage", 100.0)),
            "subject_shortages_count": int(r.get("subjectShortagesCount", 0)),
            "cgpa": float(r.get("cgpa", 0.0)) if r.get("cgpa") is not null_check(r.get("cgpa")) else 0.0,
            "current_semester": int(r.get("currentSemester", 1)),
            "semester_internship_required": 1 if r.get("internshipRequired", False) else 0,
            "internship_completed": 1 if r.get("internshipCompleted", False) else 0,
            "pending_compliance_docs": int(r.get("pendingDocsCount", 0)),
            "verified_skills_count": int(r.get("verifiedSkillsCount", 0)),
            "verified_projects_count": int(r.get("verifiedProjectsCount", 0)),
            "verified_certificates_count": int(r.get("verifiedCertificatesCount", 0)),
        }
        feature_list.append(feat)

        if "targetLabel" in r:
            labels.append(int(r["targetLabel"]))

    df_features = pd.DataFrame(feature_list)
    return df_features, np.array(labels) if labels else None

def null_check(val):
    return val is None

if __name__ == "__main__":
    print("Student360 AI Feature Extraction Module Loaded.")
    print("Ready to process historical student datasets.")
