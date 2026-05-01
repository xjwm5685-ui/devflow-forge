import { router } from "./init"
import { userRouter } from "./routers/user"
import { projectRouter } from "./routers/project"
import { workflowRouter } from "./routers/workflow"
import { taskRouter } from "./routers/task"
import { deploymentRouter } from "./routers/deployment"
import { documentRouter } from "./routers/document"
import { agentRouter } from "./routers/agent"
import { githubRouter } from "./routers/github"

export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  workflow: workflowRouter,
  task: taskRouter,
  deployment: deploymentRouter,
  document: documentRouter,
  agent: agentRouter,
  github: githubRouter,
})

export type AppRouter = typeof appRouter
