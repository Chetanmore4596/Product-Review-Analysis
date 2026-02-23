import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Doughnut, Line, Pie, Radar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:5000";
const PROJECT_NAME = "Product Review Sentiment Analysis";
const GRAPH_TYPES = ["bar", "line", "pie", "doughnut", "radar"];
const PAGE_SIZE = 10;

function renderChart(type, data) {
  const baseData = {
    labels: data.labels,
    datasets: [
      {
        label: data.title || "Dataset",
        data: data.values,
        borderWidth: 1.5,
        backgroundColor: [
          "rgba(44, 153, 255, 0.55)",
          "rgba(44, 212, 149, 0.55)",
          "rgba(255, 173, 66, 0.55)",
          "rgba(255, 114, 149, 0.55)",
          "rgba(111, 130, 255, 0.55)",
          "rgba(34, 197, 94, 0.55)",
          "rgba(59, 130, 246, 0.55)",
          "rgba(249, 115, 22, 0.55)"
        ],
        borderColor: "rgba(11, 18, 34, 0.75)"
      }
    ]
  };

  if (type === "line") return <Line data={baseData} />;
  if (type === "pie") return <Pie data={baseData} />;
  if (type === "doughnut") return <Doughnut data={baseData} />;
  if (type === "radar") return <Radar data={baseData} />;
  return <Bar data={baseData} />;
}

export default function App() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [downloadPath, setDownloadPath] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedColumn, setSelectedColumn] = useState("all");
  const [graphType, setGraphType] = useState("bar");

  const filteredRows = useMemo(() => {
    const rows = result?.summary?.preview || [];
    if (selectedColumn === "all") return rows;
    return rows.map((row) => ({ [selectedColumn]: row[selectedColumn] }));
  }, [result, selectedColumn]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const previewRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const columns = result?.summary?.columns_profile?.map((c) => c.name) || [];

  const uploadFile = async () => {
    if (!file) {
      setError("Please select a dataset file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setDownloadPath("");
    setCurrentPage(1);
    setSelectedColumn("all");

    const formData = new FormData();
    formData.append("dataset", file);

    try {
      const response = await axios.post(`${API_BASE}/api/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(response.data.analysis);
      if (response.data.download?.cleanedCsvUrl) {
        setDownloadPath(`${API_BASE}${response.data.download.cleanedCsvUrl}`);
      }
    } catch (e) {
      setError(e?.response?.data?.details || e?.response?.data?.error || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site-root">
      <div className="aura aura-one" />
      <div className="aura aura-two" />

      <motion.header className="topbar" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="brand">
          <h1>{PROJECT_NAME}</h1>
        </div>
      </motion.header>

      <main className="app-shell">
        <motion.section
          className="panel upload-panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2>Upload Dataset</h2>
          <p className="muted">Supported: CSV, Excel, JSON, Parquet, TSV, TXT</p>

          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept=".csv,.xlsx,.xls,.json,.parquet,.tsv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <div className="upload-actions">
            <button className="btn-outline choose-file-btn" onClick={() => fileInputRef.current?.click()}>
              Choose Dataset File
            </button>
            <button className="btn-primary" onClick={uploadFile} disabled={loading}>
              {loading ? "Analyzing..." : "Upload and Analyze"}
            </button>
            {downloadPath && (
              <a className="btn-download" href={downloadPath} download>
                Download Cleaned CSV
              </a>
            )}
          </div>
          <p className="file-name">{file ? `Selected: ${file.name}` : "No file selected"}</p>
          {error && <p className="error-text">{error}</p>}
        </motion.section>

        {result && (
          <>
            <motion.section className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2>Dataset Table Explorer</h2>
              <div className="controls-row">
                <label>
                  Focus column
                  <CustomDropdown
                    value={selectedColumn}
                    onChange={(value) => {
                      setSelectedColumn(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "all", label: "All columns" },
                      ...columns.map((col) => ({ value: col, label: col }))
                    ]}
                  />
                </label>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {previewRows.length > 0 && Object.keys(previewRows[0]).map((key) => <th key={key}>{key}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((value, cIdx) => (
                          <td key={`${idx}-${cIdx}`}>{String(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination-row">
                <button className="btn-outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Previous
                </button>
                <span>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
                <button
                  className="btn-outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </motion.section>

            <motion.section className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2>Graph Studio</h2>
              <div className="controls-row">
                <label>
                  Graph format
                  <CustomDropdown
                    value={graphType}
                    onChange={setGraphType}
                    options={GRAPH_TYPES.map((t) => ({ value: t, label: t.toUpperCase() }))}
                  />
                </label>
              </div>

              <div className="chart-grid">
                {result.charts.missing_by_column && (
                  <ChartCard title={result.charts.missing_by_column.title}>{renderChart(graphType, result.charts.missing_by_column)}</ChartCard>
                )}
                {result.charts.dtype_distribution && (
                  <ChartCard title={result.charts.dtype_distribution.title}>{renderChart(graphType, result.charts.dtype_distribution)}</ChartCard>
                )}
                {result.charts.sentiment_distribution && (
                  <ChartCard title={result.charts.sentiment_distribution.title}>{renderChart(graphType, result.charts.sentiment_distribution)}</ChartCard>
                )}
                {(result.charts.numeric_distributions || []).map((entry) => (
                  <ChartCard key={entry.column} title={`Distribution: ${entry.column}`}>
                    {renderChart(graphType, { title: entry.column, labels: entry.labels, values: entry.values })}
                  </ChartCard>
                ))}
                {(result.charts.top_categories || []).map((entry) => (
                  <ChartCard key={entry.column} title={`Top Categories: ${entry.column}`}>
                    {renderChart(graphType, { title: entry.column, labels: entry.labels, values: entry.values })}
                  </ChartCard>
                ))}
              </div>
            </motion.section>

            <motion.section className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2>Sentiment Analysis</h2>
              {!result.sentiment.enabled && <p>{result.sentiment.message}</p>}
              {result.sentiment.enabled && (
                <div className="sentiment-summary">
                  <p>Text column: <strong>{result.sentiment.text_column}</strong></p>
                  <p>Average sentiment score: <strong>{result.sentiment.average_score}</strong></p>
                </div>
              )}
            </motion.section>
          </>
        )}
      </main>

    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="chart-wrap">{children}</div>
    </div>
  );
}

function CustomDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="custom-dropdown" ref={rootRef}>
      <button type="button" className="custom-dropdown-btn" onClick={() => setOpen((prev) => !prev)} aria-expanded={open}>
        <span>{selected?.label}</span>
        <span className={`custom-dropdown-caret ${open ? "open" : ""}`} />
      </button>
      {open && (
        <ul className="custom-dropdown-menu" role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`custom-dropdown-item ${value === option.value ? "active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
