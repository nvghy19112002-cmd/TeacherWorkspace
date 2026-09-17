import type { DbRow, SqlValue } from '../../../database/codec';
import {
  bankSnapshotSchema,
  emptyBankSnapshot,
  type BankSnapshot,
} from '../domain/model';

export const BANK_TABLES = [
  'curriculum_nodes',
  'learning_outcomes',
  'questions',
  'question_revisions',
  'classification_runs',
  'exams',
  'exam_items',
] as const;
export type BankTableName = (typeof BANK_TABLES)[number];
export type BankDbTables = Record<BankTableName, DbRow[]>;
export interface BankDbState {
  revision: number;
  tables: BankDbTables;
}
export interface BankMutation {
  table: BankTableName;
  id: string;
  row: DbRow | null;
}

const json = (value: unknown) => JSON.stringify(value);
const parseArray = (value: SqlValue): string[] => {
  try {
    const parsed = JSON.parse(String(value ?? '[]')) as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
};

export function encodeBank(data: BankSnapshot): BankDbTables {
  return {
    curriculum_nodes: data.curriculumNodes.map((row) => ({
      id: row.id,
      parent_id: row.parentId,
      kind: row.kind,
      code: row.code,
      name: row.name,
      description: row.description,
      sort_order: row.sortOrder,
      archived: +row.archived,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
    learning_outcomes: data.learningOutcomes.map((row) => ({
      id: row.id,
      node_id: row.nodeId,
      code: row.code,
      content: row.content,
      source: row.source,
      active: +row.active,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
    questions: data.questions.map((row) => ({
      id: row.id,
      display_id: row.displayId || null,
      classification_code: row.classificationCode,
      sequence_number: row.sequenceNumber,
      raw_source: row.rawSource,
      normalized_source: row.normalizedSource,
      content_hash: row.contentHash,
      question_type: row.questionType,
      answer: row.answer,
      solution: row.solution,
      level: row.level,
      grade_node_id: row.gradeNodeId,
      domain_node_id: row.domainNodeId,
      chapter_node_id: row.chapterNodeId,
      lesson_node_id: row.lessonNodeId,
      form_node_id: row.formNodeId,
      primary_outcome_id: row.primaryOutcomeId,
      secondary_outcome_ids: json(row.secondaryOutcomeIds),
      tags: json(row.tags),
      source: row.source,
      status: row.status,
      confidence: row.confidence,
      reasoning: row.reasoning,
      warnings: json(row.warnings),
      has_image: +row.hasImage,
      usage_count: row.usageCount,
      id_locked: +row.idLocked,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      deleted_at: row.deletedAt,
    })),
    question_revisions: data.revisions.map((row) => ({
      id: row.id,
      question_id: row.questionId,
      snapshot: row.snapshot,
      reason: row.reason,
      created_at: row.createdAt,
    })),
    classification_runs: data.classificationRuns.map((row) => ({
      id: row.id,
      question_id: row.questionId,
      provider: row.provider,
      model: row.model,
      result_json: row.resultJson,
      accepted: +row.accepted,
      created_at: row.createdAt,
    })),
    exams: data.exams.map((row) => ({
      id: row.id,
      title: row.title,
      grade_node_id: row.gradeNodeId,
      duration_minutes: row.durationMinutes,
      exam_date: row.examDate,
      status: row.status,
      seed: row.seed,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
    exam_items: data.examItems.map((row) => ({
      id: row.id,
      exam_id: row.examId,
      section_id: row.sectionId,
      question_id: row.questionId,
      question_snapshot: row.questionSnapshot,
      sort_order: row.sortOrder,
      points: row.points,
      locked: +row.locked,
    })),
  };
}

export function decodeBank(tables?: BankDbTables): BankSnapshot {
  if (!tables) return emptyBankSnapshot();
  return bankSnapshotSchema.parse({
    schemaVersion: 1,
    curriculumNodes: tables.curriculum_nodes.map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      kind: row.kind,
      code: row.code,
      name: row.name,
      description: row.description,
      sortOrder: row.sort_order,
      archived: !!row.archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    learningOutcomes: tables.learning_outcomes.map((row) => ({
      id: row.id,
      nodeId: row.node_id,
      code: row.code,
      content: row.content,
      source: row.source,
      active: !!row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    questions: tables.questions.map((row) => ({
      id: row.id,
      displayId: row.display_id ?? '',
      classificationCode: row.classification_code,
      sequenceNumber: row.sequence_number,
      rawSource: row.raw_source,
      normalizedSource: row.normalized_source,
      contentHash: row.content_hash,
      questionType: row.question_type,
      answer: row.answer,
      solution: row.solution,
      level: row.level,
      gradeNodeId: row.grade_node_id,
      domainNodeId: row.domain_node_id,
      chapterNodeId: row.chapter_node_id,
      lessonNodeId: row.lesson_node_id,
      formNodeId: row.form_node_id,
      primaryOutcomeId: row.primary_outcome_id,
      secondaryOutcomeIds: parseArray(row.secondary_outcome_ids),
      tags: parseArray(row.tags),
      source: row.source,
      status: row.status,
      confidence: row.confidence,
      reasoning: row.reasoning,
      warnings: parseArray(row.warnings),
      hasImage: !!row.has_image,
      usageCount: row.usage_count,
      idLocked: !!row.id_locked,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    })),
    revisions: tables.question_revisions.map((row) => ({
      id: row.id,
      questionId: row.question_id,
      snapshot: row.snapshot,
      reason: row.reason,
      createdAt: row.created_at,
    })),
    classificationRuns: tables.classification_runs.map((row) => ({
      id: row.id,
      questionId: row.question_id,
      provider: row.provider,
      model: row.model,
      resultJson: row.result_json,
      accepted: !!row.accepted,
      createdAt: row.created_at,
    })),
    exams: tables.exams.map((row) => ({
      id: row.id,
      title: row.title,
      gradeNodeId: row.grade_node_id,
      durationMinutes: row.duration_minutes,
      examDate: row.exam_date,
      status: row.status,
      seed: row.seed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    examItems: tables.exam_items.map((row) => ({
      id: row.id,
      examId: row.exam_id,
      sectionId: row.section_id,
      questionId: row.question_id,
      questionSnapshot: row.question_snapshot,
      sortOrder: row.sort_order,
      points: row.points,
      locked: !!row.locked,
    })),
  });
}

export function diffBank(before: BankSnapshot, after: BankSnapshot): BankMutation[] {
  const left = encodeBank(before);
  const right = encodeBank(after);
  const output: BankMutation[] = [];
  for (const table of [...BANK_TABLES].reverse()) {
    const ids = new Set(right[table].map((row) => row.id));
    for (const row of left[table])
      if (!ids.has(row.id)) output.push({ table, id: String(row.id), row: null });
  }
  for (const table of BANK_TABLES) {
    const previous = new Map(left[table].map((row) => [row.id, JSON.stringify(row)]));
    for (const row of right[table])
      if (previous.get(row.id) !== JSON.stringify(row))
        output.push({ table, id: String(row.id), row });
  }
  return output;
}

export function bankMutationSql(mutation: BankMutation): { sql: string; params: SqlValue[] } {
  if (!mutation.row)
    return { sql: `DELETE FROM ${mutation.table} WHERE id = ?`, params: [mutation.id] };
  const keys = Object.keys(mutation.row);
  const updates = keys
    .filter((key) => key !== 'id')
    .map((key) => `${key}=excluded.${key}`)
    .join(',');
  return {
    sql: `INSERT INTO ${mutation.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
    params: keys.map((key) => mutation.row![key]),
  };
}
