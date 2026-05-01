import type { AgentName } from "../types/index"

export const AGENT_NAMES: AgentName[] = ["architect", "coder", "qa", "devops"]

export const AGENT_CONFIG: Record<AgentName, { label: string; color: string; icon: string; description: string }> = {
  architect: {
    label: "架构师",
    color: "#8b5cf6",
    icon: "architect",
    description: "分析需求，设计系统架构",
  },
  coder: {
    label: "编码",
    color: "#3b82f6",
    icon: "coder",
    description: "根据架构方案生成和修改代码",
  },
  qa: {
    label: "测试",
    color: "#10b981",
    icon: "qa",
    description: "审查代码，生成测试用例",
  },
  devops: {
    label: "运维",
    color: "#f59e0b",
    icon: "devops",
    description: "容器化、CI/CD 和部署",
  },
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "等待中",
  RUNNING: "运行中",
  COMPLETED: "已完成",
  FAILED: "失败",
  CANCELLED: "已取消",
}

export const TASK_TYPE_LABELS: Record<string, string> = {
  REFACTOR: "代码重构",
  GENERATE_CODE: "代码生成",
  RUN_TESTS: "运行测试",
  DEPLOY: "部署",
  GENERATE_DOCS: "生成文档",
  FULL_PIPELINE: "完整流水线",
}

export const DEFAULT_MODEL = "gpt-4o"
export const DEFAULT_CONTEXT_BUDGET = 100_000
export const MAX_AGENT_RETRIES = 3
