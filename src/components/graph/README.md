# React Flow Graph Component Implementation

## Overview

This implementation provides an interactive graph visualization component for YARIKIRU's task management system, built with React Flow and dagre for automatic layout.

## Features

### 1. **Graph Visualization**
- ✅ Interactive node and edge rendering using React Flow
- ✅ Status-based node styling (todo, in_progress, done, blocked)
- ✅ Edge type styling (dependency, sequence, conditional, blocking)
- ✅ Priority indicators with colored borders
- ✅ Tags and time estimates display

### 2. **Interactive Features**
- ✅ Drag and drop node positioning
- ✅ Add new nodes with button
- ✅ Delete nodes and edges
- ✅ Create/edit connections between nodes
- ✅ MiniMap for overview
- ✅ Zoom and pan controls
- ✅ Background grid

### 3. **Automatic Layout**
- ✅ Dagre layout algorithm integration
- ✅ Support for different graph types (dag, sequence, parallel, hierarchy, conditional, network)
- ✅ Auto-layout button for repositioning
- ✅ Direction-based layout (TB/LR)

### 4. **API Integration**
- ✅ Fetch graph data from `/api/goals/[goalId]/graph`
- ✅ Save changes back to API
- ✅ Optimistic updates
- ✅ Error handling

## File Structure

```
src/components/graph/
├── GraphView.tsx              # Main graph component with React Flow
├── GraphViewWithProvider.tsx  # Wrapper with ReactFlowProvider
├── GraphNode.tsx              # Custom node component
├── GraphEdge.tsx              # Custom edge component
├── layout.ts                  # Layout algorithms and converters
├── useGraphApi.ts             # API integration hook
├── index.ts                   # Public exports
└── README.md                  # This file
```

## Usage

### Basic Usage

```tsx
import { GraphView } from '@/components/graph'

function MyComponent() {
  return (
    <GraphView
      goalId="goal_123"
      graph={graphData}
      nodes={nodes}
      edges={edges}
      onSave={handleSave}
      editable={true}
    />
  )
}
```

### With API Integration

```tsx
import { GraphView, useGraphApi } from '@/components/graph'

function GraphPage({ goalId }: { goalId: string }) {
  const { data, isLoading, error, saveGraph } = useGraphApi(goalId)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <GraphView
      goalId={goalId}
      graph={data?.graph}
      nodes={data?.nodes || []}
      edges={data?.edges || []}
      onSave={saveGraph}
    />
  )
}
```

### Read-Only Mode

```tsx
<GraphView
  goalId={goalId}
  graph={graph}
  nodes={nodes}
  edges={edges}
  editable={false}
/>
```

## Component Props

### GraphView

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `goalId` | `string` | ✅ | Goal ID for the graph |
| `graph` | `TaskGraph \| null` | ✅ | Graph metadata |
| `nodes` | `TaskGraphNode[]` | ✅ | Array of graph nodes |
| `edges` | `TaskGraphEdge[]` | ✅ | Array of graph edges |
| `onSave` | `(changes) => Promise<void>` | ❌ | Save callback |
| `onNodeClick` | `(nodeId: string) => void` | ❌ | Node click handler |
| `onEdgeClick` | `(edgeId: string) => void` | ❌ | Edge click handler |
| `className` | `string` | ❌ | Additional CSS classes |
| `editable` | `boolean` | ❌ | Enable editing (default: true) |

## Node Styling

Nodes are styled based on their `status` property:

- **todo**: Gray background, clock icon
- **in_progress**: Blue background, spinning icon
- **done**: Green background, checkmark icon
- **blocked**: Red background, blocked icon

Priority is indicated with left border color:
- **critical**: Red
- **high**: Orange
- **medium**: Yellow
- **low**: Gray

## Edge Styling

Edges are styled based on their `edge_type`:

- **dependency**: Gray solid line
- **sequence**: Blue solid line
- **conditional**: Amber dashed line
- **blocking**: Red thick line

## Layout Algorithm

The component uses dagre for automatic layout. Layout direction and spacing are determined by graph type:

- **sequence**: Top-to-Bottom, vertical spacing 150px
- **hierarchy**: Top-to-Bottom, vertical spacing 120px
- **parallel**: Left-to-Right, horizontal spacing 150px
- **dag**: Top-to-Bottom, default spacing
- **network**: Top-to-Bottom, default spacing
- **conditional**: Top-to-Bottom, vertical spacing 120px

## API Integration

### Data Format

The component expects data in this format:

```typescript
{
  graph: {
    id: string
    goal_id: string
    title: string
    description?: string
    graph_type: GraphType
    is_primary: boolean
    created_at: string
    updated_at: string
  }
  nodes: Array<{
    id: string
    graph_id: string
    node_id: string
    label: string
    description?: string
    sort_order: number
    properties: {
      status: TaskStatus
      priority?: TaskPriority
      estimated_minutes?: number
      tags?: string[]
      icon?: string
      color?: string
    }
    x?: number
    y?: number
    started_at?: string
    completed_at?: string
    created_at: string
  }>
  edges: Array<{
    id: string
    graph_id: string
    from_node_id: string
    to_node_id: string
    edge_type: EdgeType
    condition: TaskGraphEdgeCondition
    label?: string
    created_at: string
  }>
}
```

## Demo Page

A demo page is available at `/graph-demo` with mock data to test the component:

```bash
npm run dev
# Navigate to http://localhost:3000/graph-demo
```

## Dependencies

- `reactflow`: ^11.x - Graph visualization library
- `dagre`: ^0.8.x - Layout algorithm
- `@types/dagre`: ^0.8.x - TypeScript types

## Browser Testing

The component has been tested for compilation and type safety. For visual testing:

1. Start dev server: `npm run dev`
2. Navigate to `/graph-demo`
3. Test interactions:
   - Drag nodes to reposition
   - Click "Add" button to create new nodes
   - Drag from node handles to create connections
   - Click "Layout" button to auto-arrange
   - Use mouse wheel to zoom
   - Drag canvas to pan

## Future Enhancements

Potential improvements for future iterations:

- [ ] Undo/redo functionality
- [ ] Multi-select nodes (Shift+Click)
- [ ] Copy/paste nodes
- [ ] Keyboard shortcuts
- [ ] Search and filter nodes
- [ ] Export graph as image/PDF
- [ ] Import from external formats (DOT, JSON)
- [ ] Real-time collaboration
- [ ] Node grouping and subgraphs
- [ ] Advanced layout algorithms (ELK, Graphviz)

## Troubleshooting

### Build Errors

If you see errors about ReactFlowProvider, ensure you're using `GraphViewWithProvider`:

```tsx
import { GraphView } from '@/components/graph' // Already wrapped with provider
```

### TypeScript Errors

Ensure all types are imported from correct paths:

```tsx
import type { TaskGraphNode, TaskGraphEdge, GraphType } from '@/lib/turso/graphs'
```

### Layout Issues

If nodes overlap or layout looks wrong:
1. Click the "Layout" button to re-apply auto-layout
2. Check that `graph_type` is set correctly
3. Ensure nodes don't have conflicting manual positions

## License

This component is part of the YARIKIRU project.
