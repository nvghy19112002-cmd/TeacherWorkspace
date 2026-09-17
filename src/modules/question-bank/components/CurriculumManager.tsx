import { useMemo, useState } from 'react';
import { Archive, Download, FileJson, Plus, RotateCcw, Save } from 'lucide-react';
import { errorText } from '../../../app/store';
import { useToasts } from '../../../components/feedback';
import { saveFile } from '../../../services/files';
import { parseCurriculum, PARENT_KIND, serializeCurriculum } from '../domain/curriculum';
import type { CurriculumNode } from '../domain/model';
import { useQuestionBank } from '../store';

const KIND_LABELS: Record<CurriculumNode['kind'], string> = {
  grade: 'Khối lớp', domain: 'Phân môn', chapter: 'Chương', lesson: 'Bài', form: 'Dạng',
};

function flatten(nodes: CurriculumNode[]): Array<{ node: CurriculumNode; depth: number }> {
  const output: Array<{ node: CurriculumNode; depth: number }> = [];
  const walk = (parentId: string | null, depth: number, visited: Set<string>) => {
    nodes.filter((node) => node.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder).forEach((node) => {
      if (visited.has(node.id)) return;
      output.push({ node, depth });
      walk(node.id, depth + 1, new Set([...visited, node.id]));
    });
  };
  walk(null, 0, new Set());
  return output;
}

export function CurriculumManager() {
  const data = useQuestionBank((state) => state.data);
  const commit = useQuestionBank((state) => state.commit);
  const busy = useQuestionBank((state) => state.busy);
  const seedKnttCurriculum = useQuestionBank((state) => state.seedKnttCurriculum);
  const toast = useToasts((state) => state.push);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.curriculumNodes.find((node) => node.id === selectedId);
  const [kind, setKind] = useState<CurriculumNode['kind']>('grade');
  const [parentId, setParentId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importText, setImportText] = useState('');
  const [outcomeCode, setOutcomeCode] = useState('');
  const [outcomeContent, setOutcomeContent] = useState('');
  const rows = useMemo(() => flatten(data.curriculumNodes), [data.curriculumNodes]);
  const parentKind = PARENT_KIND[kind];
  const parentOptions = parentKind ? data.curriculumNodes.filter((node) => node.kind === parentKind && !node.archived) : [];

  function resetForm(nextKind: CurriculumNode['kind'] = 'grade') {
    setKind(nextKind); setParentId(null); setCode(''); setName(''); setDescription('');
  }

  function edit(node: CurriculumNode) {
    setSelectedId(node.id); setKind(node.kind); setParentId(node.parentId); setCode(node.code);
    setName(node.name); setDescription(node.description);
  }

  async function saveNode() {
    try {
      if (!code.trim() || !name.trim()) throw new Error('Cần nhập mã và tên.');
      if (parentKind && !parentId) throw new Error(`${KIND_LABELS[kind]} cần chọn nút cha.`);
      if (!parentKind && parentId) throw new Error('Khối lớp không có nút cha.');
      const now = new Date().toISOString();
      const existing = selected?.kind === kind ? selected : undefined;
      const node: CurriculumNode = {
        id: existing?.id ?? crypto.randomUUID(), parentId, kind, code: code.trim().toUpperCase(),
        name: name.trim(), description: description.trim(), archived: existing?.archived ?? false,
        sortOrder: existing?.sortOrder ?? data.curriculumNodes.filter((item) => item.parentId === parentId).length,
        createdAt: existing?.createdAt ?? now, updatedAt: now,
      };
      await commit((snapshot) => ({
        ...snapshot,
        curriculumNodes: existing
          ? snapshot.curriculumNodes.map((item) => item.id === node.id ? node : item)
          : [...snapshot.curriculumNodes, node],
      }));
      toast(existing ? 'Đã cập nhật cây chương trình.' : 'Đã thêm nút chương trình.');
      setSelectedId(node.id);
    } catch (error) { toast(errorText(error), 'error'); }
  }

  async function archiveSelected() {
    if (!selected) return;
    await commit((snapshot) => ({
      ...snapshot,
      curriculumNodes: snapshot.curriculumNodes.map((node) => node.id === selected.id ? { ...node, archived: !node.archived, updatedAt: new Date().toISOString() } : node),
    }));
    toast(selected.archived ? 'Đã khôi phục nút.' : 'Đã lưu trữ nút; mã cũ không bị tái sử dụng.');
  }

  async function addOutcome() {
    if (!selected || !outcomeCode.trim() || !outcomeContent.trim()) {
      toast('Chọn một nút và nhập đủ mã, nội dung yêu cầu cần đạt.', 'error'); return;
    }
    const now = new Date().toISOString();
    await commit((snapshot) => ({ ...snapshot, learningOutcomes: [...snapshot.learningOutcomes, {
      id: crypto.randomUUID(), nodeId: selected.id, code: outcomeCode.trim(), content: outcomeContent.trim(),
      source: 'Chương trình GDPT 2018', active: true, createdAt: now, updatedAt: now,
    }] }));
    setOutcomeCode(''); setOutcomeContent(''); toast('Đã thêm yêu cầu cần đạt.');
  }

  async function importCurriculum() {
    try {
      const parsed = parseCurriculum(importText);
      const currentQuestions = data.questions.length;
      const replace = data.curriculumNodes.length === 0 || window.confirm(`Cây hiện tại có ${data.curriculumNodes.length} nút và ${currentQuestions} câu hỏi. Nhấn OK để hợp nhất theo ID; dữ liệu không có trong tệp vẫn được giữ.`);
      if (!replace) return;
      await commit((snapshot) => {
        const nodes = new Map(snapshot.curriculumNodes.map((node) => [node.id, node]));
        parsed.nodes.forEach((node) => nodes.set(node.id, node));
        const outcomes = new Map(snapshot.learningOutcomes.map((row) => [row.id, row]));
        parsed.learningOutcomes.forEach((row) => outcomes.set(row.id, row));
        return { ...snapshot, curriculumNodes: [...nodes.values()], learningOutcomes: [...outcomes.values()] };
      });
      toast(`Đã hợp nhất ${parsed.nodes.length} nút và ${parsed.learningOutcomes.length} yêu cầu cần đạt.`);
      setImportText('');
    } catch (error) { toast(errorText(error), 'error'); }
  }

  return (
    <div className="qb-curriculum-layout">
      <section className="panel qb-tree-panel">
        <div className="qb-panel-title"><div><h2>Cây chương trình</h2><p>{data.curriculumNodes.length} nút · {data.learningOutcomes.length} YCCD</p></div><div className="button-row"><button className="button small secondary" disabled={busy} onClick={() => void seedKnttCurriculum().then((count) => toast(count ? `Đã bổ sung ${count} nút Toán 10–11 KNTT.` : 'Cây KNTT Toán 10–11 đã có sẵn.'))}>Nạp KNTT 10–11</button><button className="button small secondary" onClick={() => { setSelectedId(null); resetForm(); }}><Plus size={15} /> Thêm</button></div></div>
        <div className="qb-tree" role="tree">
          {rows.length === 0 && <div className="qb-empty-inline">Chưa có cây chương trình. Hãy tạo thủ công hoặc nhập JSON do anh duyệt.</div>}
          {rows.map(({ node, depth }) => (
            <button key={node.id} className={`qb-tree-row ${selectedId === node.id ? 'active' : ''} ${node.archived ? 'archived' : ''}`} style={{ paddingLeft: 12 + depth * 18 }} onClick={() => edit(node)}>
              <span>{node.code}</span><strong>{node.name}</strong><small>{KIND_LABELS[node.kind]}</small>
            </button>
          ))}
        </div>
      </section>
      <div className="qb-curriculum-main">
        <section className="panel">
          <div className="qb-panel-title"><div><h2>{selected ? 'Chỉnh nút chương trình' : 'Thêm nút chương trình'}</h2><p>Mã cố định; thứ tự hiển thị độc lập.</p></div>{selected && <button className="button small secondary" onClick={() => void archiveSelected()}>{selected.archived ? <RotateCcw size={15} /> : <Archive size={15} />}{selected.archived ? 'Khôi phục' : 'Lưu trữ'}</button>}</div>
          <div className="form-grid">
            <label className="field">Loại<select value={kind} onChange={(event) => { const next = event.target.value as CurriculumNode['kind']; setKind(next); setParentId(null); }}><option value="grade">Khối lớp</option><option value="domain">Phân môn</option><option value="chapter">Chương</option><option value="lesson">Bài</option><option value="form">Dạng</option></select></label>
            <label className="field">Nút cha<select value={parentId ?? ''} disabled={!parentKind} onChange={(event) => setParentId(event.target.value || null)}><option value="">— {parentKind ? 'Chọn nút cha' : 'Không có'} —</option>{parentOptions.map((node) => <option key={node.id} value={node.id}>{node.code} · {node.name}</option>)}</select></label>
            <label className="field">Mã<input value={code} maxLength={30} onChange={(event) => setCode(event.target.value)} placeholder={kind === 'grade' ? 'Ví dụ: 0' : kind === 'domain' ? 'Ví dụ: D' : 'Ví dụ: 1'} /></label>
            <label className="field">Tên<input value={name} maxLength={200} onChange={(event) => setName(event.target.value)} /></label>
          </div>
          <label className="field">Mô tả/hồ sơ nhận diện<textarea rows={4} value={description} maxLength={4000} onChange={(event) => setDescription(event.target.value)} /></label>
          <button className="button primary" disabled={busy} onClick={() => void saveNode()}><Save size={16} /> Lưu nút</button>
        </section>
        <section className="panel">
          <h2>Yêu cầu cần đạt 2018</h2>
          <p>{selected ? `Đang gắn vào: ${selected.name}` : 'Chọn một nút trên cây trước khi thêm YCCD.'}</p>
          <div className="qb-outcome-add"><input value={outcomeCode} onChange={(event) => setOutcomeCode(event.target.value)} placeholder="Mã YCCD" /><textarea rows={2} value={outcomeContent} onChange={(event) => setOutcomeContent(event.target.value)} placeholder="Nội dung chính xác của yêu cầu cần đạt" /><button className="button secondary" onClick={() => void addOutcome()}>Thêm YCCD</button></div>
          <div className="qb-outcomes">{data.learningOutcomes.filter((row) => row.nodeId === selectedId).map((row) => <div key={row.id}><strong>{row.code}</strong><span>{row.content}</span></div>)}</div>
        </section>
        <section className="panel">
          <div className="qb-panel-title"><div><h2>Nhập/xuất cây đã duyệt</h2><p>JSON có schema; import hợp nhất bằng transaction.</p></div><button className="button small secondary" onClick={() => void saveFile('TeacherWorkspace-curriculum.json', new TextEncoder().encode(serializeCurriculum(data)), 'application/json')}><Download size={15} /> Xuất JSON</button></div>
          <textarea className="qb-json-input" rows={7} value={importText} onChange={(event) => setImportText(event.target.value)} placeholder='Dán JSON có type: "curriculum" tại đây…' />
          <button className="button secondary" disabled={!importText.trim() || busy} onClick={() => void importCurriculum()}><FileJson size={16} /> Kiểm tra và hợp nhất</button>
        </section>
      </div>
    </div>
  );
}
