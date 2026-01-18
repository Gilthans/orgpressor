import type { PersonNode, HierarchyEdge } from "orgpressor-ui";

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
  "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
  "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
];

export interface GeneratorConfig {
  numDags: number;
  nodesPerDag: number;
  numFreeNodes: number;
  seed?: number;
}

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function generateRandomName(random: () => number, usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const firstName = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  const firstName = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
  const suffix = Math.floor(random() * 1000);
  return `${firstName} ${lastName} ${suffix}`;
}

function generateDag(
  startId: number,
  nodeCount: number,
  random: () => number,
  usedNames: Set<string>
): { nodes: PersonNode[]; edges: HierarchyEdge[] } {
  const nodes: PersonNode[] = [];
  const edges: HierarchyEdge[] = [];

  if (nodeCount === 0) return { nodes, edges };

  const rootId = String(startId);
  nodes.push({
    id: rootId,
    label: generateRandomName(random, usedNames),
  });

  if (nodeCount === 1) return { nodes, edges };

  const queue: string[] = [rootId];
  let nextId = startId + 1;
  let nodesCreated = 1;

  while (queue.length > 0 && nodesCreated < nodeCount) {
    const parentId = queue.shift()!;
    const maxChildren = Math.min(3, nodeCount - nodesCreated);
    const numChildren = Math.max(1, Math.floor(random() * maxChildren) + 1);

    for (let i = 0; i < numChildren && nodesCreated < nodeCount; i++) {
      const childId = String(nextId++);
      nodes.push({
        id: childId,
        label: generateRandomName(random, usedNames),
      });
      edges.push({
        from: parentId,
        to: childId,
      });
      queue.push(childId);
      nodesCreated++;
    }
  }

  return { nodes, edges };
}

export function generateGraphData(config: GeneratorConfig): {
  nodes: PersonNode[];
  edges: HierarchyEdge[];
} {
  const { numDags, nodesPerDag, numFreeNodes, seed = Date.now() } = config;
  const random = createRandom(seed);
  const usedNames = new Set<string>();

  const allNodes: PersonNode[] = [];
  const allEdges: HierarchyEdge[] = [];

  let nextId = 1;

  for (let i = 0; i < numDags; i++) {
    const { nodes, edges } = generateDag(nextId, nodesPerDag, random, usedNames);
    allNodes.push(...nodes);
    allEdges.push(...edges);
    nextId += nodesPerDag;
  }

  for (let i = 0; i < numFreeNodes; i++) {
    allNodes.push({
      id: String(nextId++),
      label: generateRandomName(random, usedNames),
    });
  }

  return { nodes: allNodes, edges: allEdges };
}
