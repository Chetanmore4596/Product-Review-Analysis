import argparse
import json
import os
import re
from pathlib import Path

import numpy as np
import pandas as pd

POSITIVE_WORDS = {
    "good", "great", "excellent", "amazing", "awesome", "love", "liked", "best", "nice", "satisfied",
    "happy", "fantastic", "perfect", "recommend", "pleasant", "smooth", "useful", "fast", "quality"
}
NEGATIVE_WORDS = {
    "bad", "worst", "poor", "terrible", "awful", "hate", "dislike", "slow", "broken", "problem",
    "issues", "disappointed", "waste", "refund", "buggy", "hard", "difficult", "cheap", "delay"
}
TEXT_COLUMN_HINTS = ["review", "comment", "feedback", "text", "description", "content", "message"]


def detect_file_format(file_path: str):
    ext = Path(file_path).suffix.lower()
    if ext in [".csv"]:
        return "csv"
    if ext in [".tsv"]:
        return "tsv"
    if ext in [".xls", ".xlsx"]:
        return "excel"
    if ext in [".json"]:
        return "json"
    if ext in [".parquet"]:
        return "parquet"
    if ext in [".txt"]:
        return "txt"
    return "unknown"


def read_dataset(file_path: str) -> pd.DataFrame:
    file_type = detect_file_format(file_path)
    if file_type == "csv":
        return pd.read_csv(file_path)
    if file_type == "tsv":
        return pd.read_csv(file_path, sep="\t")
    if file_type == "excel":
        return pd.read_excel(file_path)
    if file_type == "json":
        return pd.read_json(file_path)
    if file_type == "parquet":
        return pd.read_parquet(file_path)
    if file_type == "txt":
        try:
            return pd.read_csv(file_path)
        except Exception:
            return pd.read_csv(file_path, sep="\t")
    raise ValueError(f"Unsupported file format: {Path(file_path).suffix}")


def clean_dataframe(df: pd.DataFrame):
    cleaned = df.copy()
    cleaned.columns = [str(c).strip().replace(" ", "_") for c in cleaned.columns]

    before_rows = len(cleaned)
    duplicates = int(cleaned.duplicated().sum())
    cleaned = cleaned.drop_duplicates()
    after_rows = len(cleaned)

    missing_before = cleaned.isna().sum().to_dict()

    for col in cleaned.columns:
        if pd.api.types.is_numeric_dtype(cleaned[col]):
            median_value = cleaned[col].median()
            cleaned[col] = cleaned[col].fillna(median_value)
        else:
            mode_series = cleaned[col].mode(dropna=True)
            fill_value = mode_series.iloc[0] if not mode_series.empty else "Unknown"
            cleaned[col] = cleaned[col].fillna(fill_value)

    missing_after = cleaned.isna().sum().to_dict()

    return cleaned, {
        "rows_before": before_rows,
        "rows_after": after_rows,
        "duplicates_removed": duplicates,
        "missing_before": missing_before,
        "missing_after": missing_after
    }


def score_sentiment(text: str):
    if not isinstance(text, str):
        return "neutral", 0
    tokens = re.findall(r"[a-zA-Z']+", text.lower())
    pos = sum(1 for t in tokens if t in POSITIVE_WORDS)
    neg = sum(1 for t in tokens if t in NEGATIVE_WORDS)
    score = pos - neg

    if score > 0:
        return "positive", score
    if score < 0:
        return "negative", score
    return "neutral", score


def detect_text_column(df: pd.DataFrame):
    lower_cols = {col.lower(): col for col in df.columns}
    for hint in TEXT_COLUMN_HINTS:
        for lc, original in lower_cols.items():
            if hint in lc:
                return original

    object_cols = [c for c in df.columns if df[c].dtype == "object"]
    if object_cols:
        return object_cols[0]
    return None


def safe_number(value):
    if value is None:
        return None
    if isinstance(value, (np.floating, float, np.integer, int)):
        if np.isnan(value) if isinstance(value, float) else False:
            return None
        return float(value)
    return value


def get_column_profiles(df: pd.DataFrame):
    profiles = []
    for col in df.columns:
        profiles.append({
            "name": col,
            "dtype": str(df[col].dtype),
            "missing": int(df[col].isna().sum()),
            "unique": int(df[col].nunique(dropna=True)),
            "sample": str(df[col].dropna().iloc[0]) if df[col].dropna().shape[0] > 0 else ""
        })
    return profiles


def build_chart_data(df: pd.DataFrame, text_col: str = None):
    charts = {}

    missing_counts = df.isna().sum().sort_values(ascending=False)
    charts["missing_by_column"] = {
        "title": "Missing Values by Column",
        "labels": missing_counts.index.tolist(),
        "values": [int(v) for v in missing_counts.values.tolist()]
    }

    dtype_counts = df.dtypes.astype(str).value_counts()
    charts["dtype_distribution"] = {
        "title": "Data Type Distribution",
        "labels": dtype_counts.index.tolist(),
        "values": [int(v) for v in dtype_counts.values.tolist()]
    }

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_distributions = []
    for col in numeric_cols[:4]:
        series = df[col].dropna()
        if series.shape[0] < 2:
            continue
        hist, bin_edges = np.histogram(series, bins=8)
        labels = [f"{round(bin_edges[i], 2)}-{round(bin_edges[i + 1], 2)}" for i in range(len(bin_edges) - 1)]
        numeric_distributions.append({
            "column": col,
            "labels": labels,
            "values": hist.astype(int).tolist()
        })
    charts["numeric_distributions"] = numeric_distributions

    category_charts = []
    object_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    for col in object_cols[:4]:
        top = df[col].astype(str).value_counts().head(10)
        category_charts.append({
            "column": col,
            "labels": top.index.tolist(),
            "values": top.values.astype(int).tolist()
        })
    charts["top_categories"] = category_charts

    if text_col and text_col in df.columns:
        sentiments = df[text_col].apply(lambda t: score_sentiment(str(t))[0])
        sentiment_counts = sentiments.value_counts()
        charts["sentiment_distribution"] = {
            "title": f"Sentiment Distribution ({text_col})",
            "labels": sentiment_counts.index.tolist(),
            "values": sentiment_counts.values.astype(int).tolist()
        }

    if len(numeric_cols) >= 2:
        corr_cols = numeric_cols[:8]
        corr = df[corr_cols].corr(numeric_only=True).fillna(0)
        charts["correlation_matrix"] = {
            "title": "Correlation Matrix",
            "labels": corr.columns.tolist(),
            "matrix": [[round(float(val), 4) for val in row] for row in corr.values.tolist()]
        }

    return charts


def build_summary(df: pd.DataFrame, cleaned_df: pd.DataFrame, cleaning_report: dict):
    rows, cols = df.shape
    summary = {
        "rows": int(rows),
        "columns": int(cols),
        "memory_mb": round(float(df.memory_usage(deep=True).sum() / (1024 * 1024)), 3),
        "duplicate_rows_original": int(df.duplicated().sum()),
        "missing_cells_original": int(df.isna().sum().sum()),
        "cleaning_report": cleaning_report,
        "preview": cleaned_df.head(30).replace({np.nan: None}).to_dict(orient="records"),
        "columns_profile": get_column_profiles(cleaned_df)
    }
    return summary


def sentiment_details(df: pd.DataFrame, text_col: str):
    if text_col is None or text_col not in df.columns:
        return {
            "enabled": False,
            "message": "No likely text/review column found for sentiment analysis."
        }

    analyzed = df[text_col].fillna("").astype(str).apply(score_sentiment)
    labels = analyzed.apply(lambda x: x[0])
    scores = analyzed.apply(lambda x: x[1])

    counts = labels.value_counts().to_dict()
    return {
        "enabled": True,
        "text_column": text_col,
        "distribution": {k: int(v) for k, v in counts.items()},
        "average_score": round(float(scores.mean()), 3),
        "sample_reviews": df[[text_col]].head(8).to_dict(orient="records")
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    df = read_dataset(input_path)
    cleaned_df, cleaning_report = clean_dataframe(df)
    text_col = detect_text_column(cleaned_df)
    cleaned_csv_name = f"{Path(output_path).stem}-cleaned.csv"
    cleaned_csv_path = str(Path(output_path).with_name(cleaned_csv_name))
    # UTF-8 BOM keeps the rupee symbol readable when opening CSV in Excel.
    cleaned_df.to_csv(cleaned_csv_path, index=False, encoding="utf-8-sig")

    result = {
        "file": {
            "name": os.path.basename(input_path),
            "format": detect_file_format(input_path)
        },
        "downloads": {
            "cleaned_csv_file": cleaned_csv_name
        },
        "summary": build_summary(df, cleaned_df, cleaning_report),
        "sentiment": sentiment_details(cleaned_df, text_col),
        "charts": build_chart_data(cleaned_df, text_col)
    }

    with open(output_path, "w", encoding="utf-8") as out:
        json.dump(result, out, ensure_ascii=False, indent=2)

    print(f"Analysis written to {output_path}")


if __name__ == "__main__":
    main()
