import {
  getTursoClient,
  execute,
  executeWithObject,
  executeOne,
  executeWithMVCC,
  executeOneWithMVCC,
  type TursoEnv
} from './turso/client'
import * as masterRepo from './turso/master'
import * as marketingRepo from './turso/marketing'
import * as usersRepo from './turso/users'
import * as kpiRepo from './turso/kpi'
import * as projectsRepo from './turso/projects'
import * as abTestsRepo from './turso/ab-tests'
import * as goalsRepo from './turso/goals'
import * as workLogsRepo from './turso/work-logs'
import * as codeRulesRepo from './turso/code-rules'
import * as githubRepo from './turso/github'
import * as ideasRepo from './turso/ideas'

export class TursoDatabase {
  public client = getTursoClient()

  public execute = execute
  public executeWithObject = executeWithObject
  public executeOne = executeOne
  public executeWithMVCC = executeWithMVCC
  public executeOneWithMVCC = executeOneWithMVCC

  // master.ts
  public getIndustries = masterRepo.getIndustries
  public getIndustryById = masterRepo.getIndustryById
  public getIndustryByName = masterRepo.getIndustryByName
  public createIndustry = masterRepo.createIndustry
  public bulkCreateIndustries = masterRepo.bulkCreateIndustries
  public getTasksByIndustry = masterRepo.getTasksByIndustry
  public createTaskLegacy = masterRepo.createTaskLegacy
  public bulkCreateTasks = masterRepo.bulkCreateTasks
  public getSchedulesByIndustry = masterRepo.getSchedulesByIndustry
  public createSchedule = masterRepo.createSchedule
  public bulkCreateSchedules = masterRepo.bulkCreateSchedules
  public getPainPointsByIndustry = masterRepo.getPainPointsByIndustry
  public getPainPointsByCategory = masterRepo.getPainPointsByCategory
  public createPainPoint = masterRepo.createPainPoint
  public getPainPointById = masterRepo.getPainPointById
  public getAISolutionById = masterRepo.getAISolutionById
  public getAISolutionsByPainPoint = masterRepo.getAISolutionsByPainPoint
  public getAISolutionsByIndustry = masterRepo.getAISolutionsByIndustry
  public createAISolution = masterRepo.createAISolution
  public getIndustryPainPointSummary = masterRepo.getIndustryPainPointSummary
  public getSolutionROISummary = masterRepo.getSolutionROISummary

  // marketing.ts
  public getMarketingAssetsByUserId = marketingRepo.getMarketingAssetsByUserId
  public getMarketingAssetById = marketingRepo.getMarketingAssetById
  public getMarketingAssetsByIndustry = marketingRepo.getMarketingAssetsByIndustry
  public createMarketingAsset = marketingRepo.createMarketingAsset
  public updateMarketingAsset = marketingRepo.updateMarketingAsset
  public deleteMarketingAsset = marketingRepo.deleteMarketingAsset
  public getAssetsBySolutionId = marketingRepo.getAssetsBySolutionId
  public getAssetsByType = marketingRepo.getAssetsByType
  public updateMarketingAssetMetrics = marketingRepo.updateMarketingAssetMetrics

  // users.ts
  public getUserById = usersRepo.getUserById
  public getUserByEmail = usersRepo.getUserByEmail
  public createUser = usersRepo.createUser
  public updateUser = usersRepo.updateUser
  public createUserActivity = usersRepo.createUserActivity
  public getUserActivities = usersRepo.getUserActivities

  // kpi.ts
  public getKPIsByUserId = kpiRepo.getKPIsByUserId
  public getKPIById = kpiRepo.getKPIById
  public createKPI = kpiRepo.createKPI
  public updateKPI = kpiRepo.updateKPI
  public deleteKPI = kpiRepo.deleteKPI
  public getKPISnapshots = kpiRepo.getKPISnapshots
  public recordKPISnapshot = kpiRepo.recordKPISnapshot

  // projects.ts
  public getProjectsByUserId = projectsRepo.getProjectsByUserId
  public getProjectById = projectsRepo.getProjectById
  public createProject = projectsRepo.createProject
  public updateProject = projectsRepo.updateProject
  public deleteProject = projectsRepo.deleteProject
  public getMilestonesByProject = projectsRepo.getMilestonesByProject
  public getMilestoneById = projectsRepo.getMilestoneById
  public createMilestone = projectsRepo.createMilestone
  public updateMilestone = projectsRepo.updateMilestone
  public deleteMilestone = projectsRepo.deleteMilestone
  public getTasksByProject = projectsRepo.getTasksByProject
  public getTaskById = projectsRepo.getTaskById
  public createTask = projectsRepo.createTask
  public updateTask = projectsRepo.updateTask
  public deleteTask = projectsRepo.deleteTask
  public getSubTasks = projectsRepo.getSubTasks
  public linkProjectToSolution = projectsRepo.linkProjectToSolution
  public getProjectsBySolutionId = projectsRepo.getProjectsBySolutionId

  // ab-tests.ts
  public getABTestsByUserId = abTestsRepo.getABTestsByUserId
  public getABTestById = abTestsRepo.getABTestById
  public createABTest = abTestsRepo.createABTest
  public updateABTest = abTestsRepo.updateABTest
  public deleteABTest = abTestsRepo.deleteABTest
  public recordImpression = abTestsRepo.recordImpression
  public getImpressionsByABTest = abTestsRepo.getImpressionsByABTest

  // goals.ts
  public createGoal = goalsRepo.createGoal
  public getGoalById = goalsRepo.getGoalById
  public getGoalsByUserId = goalsRepo.getGoalsByUserId
  public updateGoalStatus = goalsRepo.updateGoalStatus
  public createGeneratedTasks = goalsRepo.createGeneratedTasks
  public getTasksByGoalId = goalsRepo.getTasksByGoalId
  public updateGeneratedTaskStatus = goalsRepo.updateGeneratedTaskStatus
  public updateSubtaskStatus = goalsRepo.updateSubtaskStatus
  public toggleTaskUrgent = goalsRepo.toggleTaskUrgent
  public getUrgentTasksByGoal = goalsRepo.getUrgentTasksByGoal
  public deleteGoal = goalsRepo.deleteGoal
  public getGoalProgress = goalsRepo.getGoalProgress

  // work-logs.ts
  public getWorkLogsAggregation = workLogsRepo.getWorkLogsAggregation
  public getTimeStatsByPattern = workLogsRepo.getTimeStatsByPattern
  public getCompletedGoalsForTraining = workLogsRepo.getCompletedGoalsForTraining
  public getPredictionAccuracy = workLogsRepo.getPredictionAccuracy
  public getHistoricalGoalsForPrediction = workLogsRepo.getHistoricalGoalsForPrediction
  public getTimeStatsByCategory = workLogsRepo.getTimeStatsByCategory

  // code-rules.ts
  public getUserCodeRules = codeRulesRepo.getUserCodeRules
  public getUserCodeRule = codeRulesRepo.getUserCodeRule
  public upsertUserCodeRule = codeRulesRepo.upsertUserCodeRule
  public deleteUserCodeRule = codeRulesRepo.deleteUserCodeRule
  public resetUserCodeRulesToDefault = codeRulesRepo.resetUserCodeRulesToDefault
  public createReviewHistory = codeRulesRepo.createReviewHistory
  public getReviewHistory = codeRulesRepo.getReviewHistory
  public getReviewHistoryByGoal = codeRulesRepo.getReviewHistoryByGoal
  public getReviewStats = codeRulesRepo.getReviewStats

  // github.ts
  public getGitHubRepositoriesByUserId = githubRepo.getGitHubRepositoriesByUserId
  public getGitHubRepositoryById = githubRepo.getGitHubRepositoryById
  public getGitHubRepositoryByGithubId = githubRepo.getGitHubRepositoryByGithubId
  public createGitHubRepository = githubRepo.createGitHubRepository
  public updateGitHubRepository = githubRepo.updateGitHubRepository
  public archiveGitHubRepository = githubRepo.archiveGitHubRepository
  public deleteGitHubRepository = githubRepo.deleteGitHubRepository

  // ideas.ts
  public getIdeasByUserId = ideasRepo.getIdeasByUserId
  public getIdeaById = ideasRepo.getIdeaById
  public getDraftIdeasCount = ideasRepo.getDraftIdeasCount
  public createIdea = ideasRepo.createIdea
  public updateIdea = ideasRepo.updateIdea
  public updateIdeaStatus = ideasRepo.updateIdeaStatus
  public archiveIdea = ideasRepo.archiveIdea
  public deleteIdea = ideasRepo.deleteIdea
  public convertIdeaToProject = ideasRepo.convertIdeaToProject
}

let dbInstance: TursoDatabase | null = null

export function getDatabase(): TursoDatabase {
  if (!dbInstance) {
    dbInstance = new TursoDatabase()
  }
  return dbInstance
}

export type { TursoEnv }
