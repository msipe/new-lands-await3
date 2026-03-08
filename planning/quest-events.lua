local ____lualib = require("lualib_bundle")
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArrayIncludes = ____lualib.__TS__ArrayIncludes
local __TS__ArraySome = ____lualib.__TS__ArraySome
local ____exports = {}
local ____content_2Dregistry = require("planning.content-registry")
local getQuestById = ____content_2Dregistry.getQuestById
local ____quest_2Dlog = require("planning.quest-log")
local areObjectivesComplete = ____quest_2Dlog.areObjectivesComplete
local incrementObjectiveProgress = ____quest_2Dlog.incrementObjectiveProgress
local listQuestEntries = ____quest_2Dlog.listQuestEntries
local setQuestStatus = ____quest_2Dlog.setQuestStatus
local function toProgressChange(self, questId, objectiveId, entry)
    if entry == nil then
        return nil
    end
    local objective = __TS__ArrayFind(
        entry.objectives,
        function(____, candidate) return candidate.id == objectiveId end
    )
    if objective == nil then
        return nil
    end
    return {
        questId = questId,
        objectiveId = objectiveId,
        currentCount = objective.currentCount,
        targetCount = objective.targetCount,
        completed = objective.completed,
        status = entry.status
    }
end
local function listActiveQuestEntries(self)
    return __TS__ArrayFilter(
        listQuestEntries(nil),
        function(____, entry) return entry.status ~= "completed" end
    )
end
function ____exports.recordEnemyDefeated(self, enemyId)
    local changes = {}
    for ____, entry in ipairs(listActiveQuestEntries(nil)) do
        local quest = getQuestById(nil, entry.questId)
        for ____, objective in ipairs(quest.objectives) do
            do
                if objective.kind ~= "kill-enemy" then
                    goto __continue10
                end
                if not __TS__ArrayIncludes(objective.enemyIds, enemyId) then
                    goto __continue10
                end
                local nextEntry = incrementObjectiveProgress(nil, entry.questId, objective.id, 1)
                local change = toProgressChange(nil, entry.questId, objective.id, nextEntry)
                if change ~= nil then
                    changes[#changes + 1] = change
                end
            end
            ::__continue10::
        end
    end
    return changes
end
function ____exports.recordItemCollected(self, itemId, amount)
    if amount == nil then
        amount = 1
    end
    local changes = {}
    for ____, entry in ipairs(listActiveQuestEntries(nil)) do
        local quest = getQuestById(nil, entry.questId)
        for ____, objective in ipairs(quest.objectives) do
            do
                if objective.kind ~= "collect-item" then
                    goto __continue18
                end
                if not __TS__ArrayIncludes(objective.itemIds, itemId) then
                    goto __continue18
                end
                local nextEntry = incrementObjectiveProgress(nil, entry.questId, objective.id, amount)
                local change = toProgressChange(nil, entry.questId, objective.id, nextEntry)
                if change ~= nil then
                    changes[#changes + 1] = change
                end
            end
            ::__continue18::
        end
    end
    return changes
end
local function visitTileObjectiveMatches(self, objective, event)
    if objective.zone ~= nil and objective.zone ~= event.zone then
        return false
    end
    if objective.tileIds == nil or #objective.tileIds == 0 then
        return true
    end
    local candidateIds = __TS__ArrayFilter(
        {event.tileId, event.specialTileId, event.tileKey},
        function(____, value) return value ~= nil end
    )
    return __TS__ArraySome(
        candidateIds,
        function(____, value)
            local ____opt_0 = objective.tileIds
            return ____opt_0 and __TS__ArrayIncludes(objective.tileIds, value)
        end
    )
end
function ____exports.recordTileVisited(self, event)
    local changes = {}
    for ____, entry in ipairs(listActiveQuestEntries(nil)) do
        local quest = getQuestById(nil, entry.questId)
        for ____, objective in ipairs(quest.objectives) do
            do
                if objective.kind ~= "visit-tile" then
                    goto __continue31
                end
                if not visitTileObjectiveMatches(nil, objective, event) then
                    goto __continue31
                end
                local nextEntry = incrementObjectiveProgress(nil, entry.questId, objective.id, 1)
                local change = toProgressChange(nil, entry.questId, objective.id, nextEntry)
                if change ~= nil then
                    changes[#changes + 1] = change
                end
            end
            ::__continue31::
        end
    end
    return changes
end
function ____exports.recordNpcInteracted(self, npcId)
    local turnedReadyQuestIds = {}
    for ____, entry in ipairs(listActiveQuestEntries(nil)) do
        do
            if entry.turnInNpcId ~= npcId then
                goto __continue38
            end
            if not areObjectivesComplete(nil, entry.questId) then
                goto __continue38
            end
            local next = setQuestStatus(nil, entry.questId, "ready-to-turn-in")
            if (next and next.status) == "ready-to-turn-in" then
                turnedReadyQuestIds[#turnedReadyQuestIds + 1] = entry.questId
            end
        end
        ::__continue38::
    end
    return turnedReadyQuestIds
end
return ____exports
