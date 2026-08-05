"""
Student360 AI — Model Evaluation & Metrics Template
Computes Accuracy, Precision, Recall, F1-Score, and Confusion Matrix for trained models.
"""

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

def evaluate_model_performance(model_name, y_true, y_pred):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred)

    print(f"\n==========================================")
    print(f" Model Evaluation: {model_name}")
    print(f"==========================================")
    print(f" Accuracy:  {acc * 100:.2f}%")
    print(f" Precision: {prec * 100:.2f}%")
    print(f" Recall:    {rec * 100:.2f}%")
    print(f" F1-Score:  {f1 * 100:.2f}%")
    print(f"\n Confusion Matrix:\n{cm}")
    print(f"\n Detailed Classification Report:\n{classification_report(y_true, y_pred, zero_division=0)}")
    print(f"==========================================\n")

    return {
        "model_name": model_name,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "confusion_matrix": cm.tolist()
    }
