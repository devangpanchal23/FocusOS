import React from 'react';
import { Plus, Trash2, FolderPlus } from 'lucide-react';

export const ADVANCED_TRIGGER_TYPES = ['SCREEN_TIME_LIMIT', 'REELS_LIMIT', 'REEL_COUNT_LIMIT', 'FOCUS_START'];
export const ADVANCED_OPERATORS = ['GREATER_THAN', 'LESS_THAN', 'EQUALS'];

export interface ConditionLeaf {
  id: string;
  kind: 'condition';
  triggerType: string;
  conditionOperator: string;
  thresholdValue: string;
  scopeValue?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
}

export interface ConditionGroupNode {
  id: string;
  kind: 'group';
  logic: 'AND' | 'OR';
  children: (ConditionLeaf | ConditionGroupNode)[];
}

let idCounter = 0;
export function nextId() {
  idCounter += 1;
  return `node-${Date.now()}-${idCounter}`;
}

export function emptyLeaf(): ConditionLeaf {
  return {
    id: nextId(),
    kind: 'condition',
    triggerType: 'SCREEN_TIME_LIMIT',
    conditionOperator: 'GREATER_THAN',
    thresholdValue: '30',
    scopeValue: '',
    timeWindowStart: '',
    timeWindowEnd: '',
  };
}

export function emptyGroup(logic: 'AND' | 'OR' = 'AND'): ConditionGroupNode {
  return { id: nextId(), kind: 'group', logic, children: [emptyLeaf()] };
}

function updateNodeById(
  tree: ConditionGroupNode,
  id: string,
  updater: (node: ConditionLeaf | ConditionGroupNode) => ConditionLeaf | ConditionGroupNode
): ConditionGroupNode {
  if (tree.id === id) {
    return updater(tree) as ConditionGroupNode;
  }
  return {
    ...tree,
    children: tree.children.map((child) => {
      if (child.id === id) return updater(child) as ConditionLeaf | ConditionGroupNode;
      if (child.kind === 'group') return updateNodeById(child, id, updater);
      return child;
    }),
  };
}

function removeNodeById(tree: ConditionGroupNode, id: string): ConditionGroupNode {
  return {
    ...tree,
    children: tree.children
      .filter((c) => c.id !== id)
      .map((c) => (c.kind === 'group' ? removeNodeById(c, id) : c)),
  };
}

function addLeafToGroup(tree: ConditionGroupNode, groupId: string): ConditionGroupNode {
  if (tree.id === groupId) {
    return { ...tree, children: [...tree.children, emptyLeaf()] };
  }
  return {
    ...tree,
    children: tree.children.map((c) => (c.kind === 'group' ? addLeafToGroup(c, groupId) : c)),
  };
}

function addGroupToGroup(tree: ConditionGroupNode, groupId: string): ConditionGroupNode {
  if (tree.id === groupId) {
    return { ...tree, children: [...tree.children, emptyGroup(tree.logic === 'AND' ? 'OR' : 'AND')] };
  }
  return {
    ...tree,
    children: tree.children.map((c) => (c.kind === 'group' ? addGroupToGroup(c, groupId) : c)),
  };
}

interface BuilderProps {
  tree: ConditionGroupNode;
  onChange: (tree: ConditionGroupNode) => void;
  depth?: number;
}

export const ConditionGroupBuilder: React.FC<BuilderProps> = ({ tree, onChange }) => {
  const updateLeaf = (leafId: string, patch: Partial<ConditionLeaf>) => {
    onChange(
      updateNodeById(tree, leafId, (n) => (n.kind === 'condition' ? { ...n, ...patch } : n)) as ConditionGroupNode
    );
  };

  const removeNode = (id: string) => {
    onChange(removeNodeById(tree, id));
  };

  const addLeaf = (groupId: string) => {
    onChange(addLeafToGroup(tree, groupId));
  };

  const addGroup = (groupId: string) => {
    onChange(addGroupToGroup(tree, groupId));
  };

  return (
    <RenderGroup
      node={tree}
      root={tree}
      onSetLogic={(id, logic) =>
        onChange(updateNodeById(tree, id, (n) => (n.kind === 'group' ? { ...n, logic } : n)) as ConditionGroupNode)
      }
      onUpdateLeaf={updateLeaf}
      onRemove={removeNode}
      onAddLeaf={addLeaf}
      onAddGroup={addGroup}
      depth={0}
    />
  );
};

const RenderGroup: React.FC<{
  node: ConditionGroupNode;
  root: ConditionGroupNode;
  onSetLogic: (id: string, logic: 'AND' | 'OR') => void;
  onUpdateLeaf: (leafId: string, patch: Partial<ConditionLeaf>) => void;
  onRemove: (id: string) => void;
  onAddLeaf: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  depth: number;
}> = ({ node, onSetLogic, onUpdateLeaf, onRemove, onAddLeaf, onAddGroup, depth }) => {
  return (
    <div
      className={`p-3 rounded-xl border space-y-2 ${
        depth === 0 ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-900/60 border-indigo-500/20'
      }`}
      style={{ marginLeft: depth > 0 ? 12 : 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
          {(['AND', 'OR'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onSetLogic(node.id, l)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                node.logic === l ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAddLeaf(node.id)}
            className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Condition
          </button>
          <button
            type="button"
            onClick={() => onAddGroup(node.id)}
            className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <FolderPlus className="w-3 h-3" /> Group
          </button>
          {depth > 0 && (
            <button type="button" onClick={() => onRemove(node.id)} className="text-slate-500 hover:text-rose-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {node.children.map((child) =>
        child.kind === 'group' ? (
          <RenderGroup
            key={child.id}
            node={child}
            root={node}
            onSetLogic={onSetLogic}
            onUpdateLeaf={onUpdateLeaf}
            onRemove={onRemove}
            onAddLeaf={onAddLeaf}
            onAddGroup={onAddGroup}
            depth={depth + 1}
          />
        ) : (
          <div key={child.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={child.triggerType}
                onChange={(e) => onUpdateLeaf(child.id, { triggerType: e.target.value })}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {ADVANCED_TRIGGER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select
                value={child.conditionOperator}
                onChange={(e) => onUpdateLeaf(child.id, { conditionOperator: e.target.value })}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {ADVANCED_OPERATORS.map((op) => (
                  <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <input
                type="number"
                placeholder="Threshold"
                value={child.thresholdValue}
                onChange={(e) => onUpdateLeaf(child.id, { thresholdValue: e.target.value })}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => onRemove(child.id)}
                className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center justify-end gap-1"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

// Flattens the tree into the shape the backend's AutomationConditionGroup/AutomationCondition tables expect.
export function flattenConditionTree(tree: ConditionGroupNode) {
  const groups: { id: string; logic: 'AND' | 'OR'; parentGroupId: string | null; orderIndex: number }[] = [];
  const conditions: (ConditionLeaf & { groupId: string; orderIndex: number })[] = [];

  let groupOrder = 0;
  function walk(node: ConditionGroupNode, parentGroupId: string | null) {
    groups.push({ id: node.id, logic: node.logic, parentGroupId, orderIndex: groupOrder++ });
    let condOrder = 0;
    for (const child of node.children) {
      if (child.kind === 'group') {
        walk(child, node.id);
      } else {
        conditions.push({ ...child, groupId: node.id, orderIndex: condOrder++ });
      }
    }
  }
  walk(tree, null);
  return { groups, conditions };
}
