import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create demo user
  const user = await prisma.user.upsert({
    where: { githubId: 12345 },
    update: {},
    create: {
      githubId: 12345,
      login: "demo-user",
      email: "demo@devflow.dev",
      avatarUrl: "https://avatars.githubusercontent.com/u/12345",
      accessToken: "mock-token",
    },
  })
  console.log(`Created user: ${user.login}`)

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { id: "proj-sample-1" },
    update: {},
    create: {
      id: "proj-sample-1",
      name: "E-Commerce API",
      description: "A RESTful API for an e-commerce platform built with Node.js and Express",
      githubRepo: "demo-user/ecommerce-api",
      githubBranch: "main",
      userId: user.id,
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: "proj-sample-2" },
    update: {},
    create: {
      id: "proj-sample-2",
      name: "Task Manager App",
      description: "A full-stack task management application with React frontend",
      githubRepo: "demo-user/task-manager",
      githubBranch: "main",
      userId: user.id,
    },
  })
  console.log(`Created projects: ${project1.name}, ${project2.name}`)

  // Create workflow templates
  await prisma.workflow.upsert({
    where: { id: "tmpl-refactor" },
    update: {},
    create: {
      id: "tmpl-refactor",
      name: "Code Refactor Pipeline",
      description: "Automated code refactoring with architecture analysis, implementation, and testing",
      projectId: project1.id,
      isTemplate: true,
      templateTag: "refactor",
      definition: JSON.stringify({
        nodes: [
          { id: "trigger-1", type: "trigger", position: { x: 250, y: 0 }, data: { type: "trigger", label: "Start" } },
          { id: "architect-1", type: "agent", position: { x: 250, y: 100 }, data: { type: "agent", label: "Analyze Architecture", agentName: "architect" } },
          { id: "coder-1", type: "agent", position: { x: 250, y: 200 }, data: { type: "agent", label: "Implement Changes", agentName: "coder" } },
          { id: "qa-1", type: "agent", position: { x: 250, y: 300 }, data: { type: "agent", label: "Review & Test", agentName: "qa" } },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "architect-1" },
          { id: "e2", source: "architect-1", target: "coder-1" },
          { id: "e3", source: "coder-1", target: "qa-1" },
        ],
      }),
    },
  })

  await prisma.workflow.upsert({
    where: { id: "tmpl-deploy" },
    update: {},
    create: {
      id: "tmpl-deploy",
      name: "Deploy Pipeline",
      description: "Build, test, containerize, and deploy your application",
      projectId: project1.id,
      isTemplate: true,
      templateTag: "deploy",
      definition: JSON.stringify({
        nodes: [
          { id: "trigger-1", type: "trigger", position: { x: 250, y: 0 }, data: { type: "trigger", label: "Start" } },
          { id: "coder-1", type: "agent", position: { x: 250, y: 100 }, data: { type: "agent", label: "Prepare Code", agentName: "coder" } },
          { id: "qa-1", type: "agent", position: { x: 250, y: 200 }, data: { type: "agent", label: "Run Tests", agentName: "qa" } },
          { id: "devops-1", type: "agent", position: { x: 250, y: 300 }, data: { type: "agent", label: "Deploy", agentName: "devops" } },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "coder-1" },
          { id: "e2", source: "coder-1", target: "qa-1" },
          { id: "e3", source: "qa-1", target: "devops-1" },
        ],
      }),
    },
  })

  await prisma.workflow.upsert({
    where: { id: "tmpl-docs" },
    update: {},
    create: {
      id: "tmpl-docs",
      name: "Full Documentation",
      description: "Generate comprehensive documentation with diagrams and audio narration",
      projectId: project2.id,
      isTemplate: true,
      templateTag: "docs",
      definition: JSON.stringify({
        nodes: [
          { id: "trigger-1", type: "trigger", position: { x: 250, y: 0 }, data: { type: "trigger", label: "Start" } },
          { id: "architect-1", type: "agent", position: { x: 250, y: 100 }, data: { type: "agent", label: "Analyze Codebase", agentName: "architect" } },
          { id: "coder-1", type: "agent", position: { x: 250, y: 200 }, data: { type: "agent", label: "Generate Docs", agentName: "coder" } },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "architect-1" },
          { id: "e2", source: "architect-1", target: "coder-1" },
        ],
      }),
    },
  })
  console.log("Created workflow templates")

  // Create sample tasks
  await prisma.task.create({
    data: {
      projectId: project1.id,
      userId: user.id,
      status: "COMPLETED",
      type: "REFACTOR",
      input: JSON.stringify({ prompt: "Refactor the authentication module to use JWT tokens" }),
      output: JSON.stringify({ summary: "Successfully refactored auth module", filesChanged: 5 }),
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
    },
  })

  await prisma.task.create({
    data: {
      projectId: project2.id,
      userId: user.id,
      status: "RUNNING",
      type: "GENERATE_DOCS",
      input: JSON.stringify({ prompt: "Generate API documentation for all endpoints" }),
      startedAt: new Date(),
    },
  })
  console.log("Created sample tasks")

  console.log("Seed completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
