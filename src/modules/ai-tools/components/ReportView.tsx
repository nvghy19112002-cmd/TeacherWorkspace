import type { Report } from '../domain/model';
export function ReportView({
  report,
  onLine,
}: {
  report: Report;
  onLine?: (line: number) => void;
}) {
  return (
    <div className="ai-report">
      <h3>Kết quả phản biện</h3>
      <p className="ai-prose">{report.summary}</p>
      {report.issues.map((issue, index) => (
        <article className="ai-issue" key={index}>
          <span className={`ai-severity ${issue.severity}`}>{issue.severity}</span>
          {issue.line && (
            <button className="button" disabled={!onLine} onClick={() => onLine?.(issue.line!)}>
              Dòng {issue.line}
            </button>
          )}
          <strong>{issue.message}</strong>
          <p className="ai-prose">{issue.suggestion}</p>
        </article>
      ))}
      {!!report.uncertainty.length && (
        <>
          <h3>Chưa thể kết luận</h3>
          <ul>
            {report.uncertainty.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <p>
        Đây là đề xuất của AI, không phải chứng nhận đề đúng. Cần giáo viên kiểm tra trước khi sử
        dụng.
      </p>
    </div>
  );
}
