"""
Student360 AI — Supervised Model Training Template
Trains Logistic Regression, Decision Tree, and Random Forest classifiers on historical institutional data.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from evaluation_template import evaluate_model_performance

def train_and_evaluate(X, y):
    print("Executing Train/Test Split (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Logistic Regression
    print("\n--- 1. Training Logistic Regression ---")
    log_reg = LogisticRegression(random_state=42)
    log_reg.fit(X_train_scaled, y_train)
    y_pred_lr = log_reg.predict(X_test_scaled)
    evaluate_model_performance("Logistic Regression", y_test, y_pred_lr)

    # 2. Decision Tree
    print("\n--- 2. Training Decision Tree Classifier ---")
    dt_clf = DecisionTreeClassifier(max_depth=5, random_state=42)
    dt_clf.fit(X_train, y_train)
    y_pred_dt = dt_clf.predict(X_test)
    evaluate_model_performance("Decision Tree", y_test, y_pred_dt)

    # 3. Random Forest Classifier
    print("\n--- 3. Training Random Forest Classifier ---")
    rf_clf = RandomForestClassifier(n_estimators=100, max_depth=7, random_state=42)
    rf_clf.fit(X_train, y_train)
    y_pred_rf = rf_clf.predict(X_test)
    evaluate_model_performance("Random Forest", y_test, y_pred_rf)

    return {
        "scaler": scaler,
        "logistic_regression": log_reg,
        "decision_tree": dt_clf,
        "random_forest": rf_clf
    }

if __name__ == "__main__":
    print("Student360 AI Supervised Training Template.")
    print("Execute this script when historical student data CSV/JSON is available.")
