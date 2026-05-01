import { prisma } from "@/lib/db"
import { generateNarration } from "./audio-generator"
import { generateVideo } from "./video-generator"

interface GenerateDocumentParams {
  projectId: string
  title: string
  options: {
    includeDiagrams: boolean
    includeNarration: boolean
    includeVideo: boolean
  }
}

export async function generateDocument(docId: string, params: GenerateDocumentParams): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
    })

    // Generate document content
    const content = {
      title: params.title,
      sections: [
        {
          heading: "Overview",
          content: `This document provides a comprehensive overview of the ${project?.name ?? "project"} application. The system is designed with scalability and maintainability in mind, following modern software engineering best practices.`,
        },
        {
          heading: "Architecture",
          content: `The application follows a modular architecture pattern with clear separation of concerns:\n\n- **API Layer**: Express.js route handlers with middleware chain\n- **Service Layer**: Business logic encapsulation\n- **Data Layer**: Prisma ORM with PostgreSQL\n- **Auth Layer**: JWT-based authentication with refresh tokens`,
        },
        {
          heading: "API Endpoints",
          content: `### Authentication\n- \`POST /api/auth/login\` - User login\n- \`POST /api/auth/register\` - User registration\n- \`POST /api/auth/refresh\` - Token refresh\n\n### Users\n- \`GET /api/users\` - List users\n- \`GET /api/users/:id\` - Get user\n- \`PATCH /api/users/:id\` - Update user`,
        },
        {
          heading: "Deployment",
          content: `The application is containerized using Docker with multi-stage builds for optimal image size. CI/CD is handled through GitHub Actions with automated testing and deployment.\n\n### Environment Variables\n- \`DATABASE_URL\` - PostgreSQL connection string\n- \`JWT_SECRET\` - JWT signing secret\n- \`REDIS_URL\` - Redis connection string`,
        },
      ],
    }

    const diagrams = params.options.includeDiagrams ? [
      {
        type: "architecture",
        title: "System Architecture",
        mermaid: `graph TB
    Client[Client] --> API[API Gateway]
    API --> Auth[Auth Service]
    API --> User[User Service]
    API --> Product[Product Service]
    Auth --> DB[(Database)]
    User --> DB
    Product --> DB
    API --> Cache[Redis Cache]`,
      },
      {
        type: "sequence",
        title: "Authentication Flow",
        mermaid: `sequenceDiagram
    Client->>API: POST /auth/login
    API->>Auth: Validate credentials
    Auth->>DB: Query user
    DB-->>Auth: User data
    Auth->>Auth: Generate JWT
    Auth-->>API: Tokens
    API-->>Client: { accessToken, refreshToken }`,
      },
    ] : []

    // Generate audio narration if requested
    let audioUrl: string | undefined
    if (params.options.includeNarration) {
      const narrationText = content.sections.map((s) => `${s.heading}. ${s.content}`).join("\n\n")
      const audioResult = await generateNarration({
        text: narrationText,
        outputDir: `storage/audio/${docId}`,
      })
      if (audioResult.success && audioResult.filePath) {
        audioUrl = audioResult.filePath
      }
    }

    // Generate video slideshow if requested
    let videoUrl: string | undefined
    if (params.options.includeVideo) {
      const slides = [
        { type: "title" as const, title: params.title, content: project?.name ?? "", duration: 5 },
        ...content.sections.map((s) => ({
          type: "text" as const,
          title: s.heading,
          content: s.content.slice(0, 500),
          duration: 8,
        })),
        ...diagrams.map((d) => ({
          type: "diagram" as const,
          title: d.title,
          content: d.mermaid,
          duration: 10,
        })),
      ]

      const videoResult = await generateVideo({
        slides,
        title: params.title,
        outputDir: `storage/video/${docId}`,
      })
      if (videoResult.success && videoResult.htmlPath) {
        videoUrl = videoResult.htmlPath
      }
    }

    // Update document in database
    await prisma.document.update({
      where: { id: docId },
      data: {
        content: JSON.stringify(content),
        diagrams: JSON.stringify(diagrams),
        audioUrl: audioUrl ?? undefined,
        videoUrl: videoUrl ?? undefined,
        status: "COMPLETED",
      },
    })
  } catch {
    await prisma.document.update({
      where: { id: docId },
      data: { status: "FAILED" },
    })
  }
}
