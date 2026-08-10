import React from "react";

function CustomError({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "#020617", color: "#f8fafc", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
        {statusCode ? `Error ${statusCode}` : "An error occurred"}
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.5rem" }}>
        {statusCode === 404 ? "The requested resource could not be found." : "An unexpected server error occurred."}
      </p>
      <div style={{ marginTop: "1.5rem" }}>
        <a
          href="/"
          style={{
            padding: "0.625rem 1.25rem",
            backgroundColor: "#4f46e5",
            color: "#ffffff",
            borderRadius: "0.75rem",
            textDecoration: "none",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}

CustomError.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default CustomError;
