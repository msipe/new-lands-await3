local ____lualib = require("lualib_bundle")
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ObjectKeys = ____lualib.__TS__ObjectKeys
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local __TS__ObjectValues = ____lualib.__TS__ObjectValues
local __TS__ArraySort = ____lualib.__TS__ArraySort
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArrayEvery = ____lualib.__TS__ArrayEvery
local __TS__ArraySome = ____lualib.__TS__ArraySome
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local ____exports = {}
local ____content_2Dregistry = require("planning.content-registry")
local getQuestById = ____content_2Dregistry.getQuestById
local questLogState = {acceptedQuestIds = {}, entriesByQuestId = {}, nextTick = 1}
local function buildObjectiveProgress(self, quest)
    return __TS__ArrayMap(
        quest.objectives,
        function(____, objective) return {
            id = objective.id,
            kind = objective.kind,
            description = objective.description,
            currentCount = 0,
            targetCount = math.max(
                1,
                math.floor(objective.targetCount)
            ),
            completed = false
        } end
    )
end
local function createQuestEntry(self, questId)
    local quest = getQuestById(nil, questId)
    local ____quest_id_3 = quest.id
    local ____quest_name_4 = quest.name
    local ____quest_category_5 = quest.category
    local ____quest_offerNpcId_6 = quest.offerNpcId
    local ____quest_turnInNpcId_7 = quest.turnInNpcId
    local ____questLogState_0, ____nextTick_1 = questLogState, "nextTick"
    local ____questLogState_nextTick_2 = ____questLogState_0[____nextTick_1]
    ____questLogState_0[____nextTick_1] = ____questLogState_nextTick_2 + 1
    return {
        questId = ____quest_id_3,
        questName = ____quest_name_4,
        category = ____quest_category_5,
        status = "accepted",
        offerNpcId = ____quest_offerNpcId_6,
        turnInNpcId = ____quest_turnInNpcId_7,
        acceptedAtTick = ____questLogState_nextTick_2,
        completedAtTick = nil,
        turnedInAtTick = nil,
        objectives = buildObjectiveProgress(nil, quest)
    }
end
function ____exports.resetQuestLogForNewRun(self)
    questLogState.acceptedQuestIds = {}
    questLogState.entriesByQuestId = {}
    questLogState.nextTick = 1
end
function ____exports.acceptQuest(self, questId)
    if questLogState.entriesByQuestId[questId] ~= nil then
        return questLogState.entriesByQuestId[questId]
    end
    local entry = createQuestEntry(nil, questId)
    questLogState.entriesByQuestId[questId] = entry
    questLogState.acceptedQuestIds[questId] = true
    return entry
end
function ____exports.isQuestAccepted(self, questId)
    return questLogState.acceptedQuestIds[questId] == true
end
function ____exports.getAcceptedQuestIds(self)
    return __TS__ObjectKeys(questLogState.acceptedQuestIds)
end
function ____exports.getQuestState(self, questId)
    local entry = questLogState.entriesByQuestId[questId]
    if entry == nil then
        return nil
    end
    return __TS__ObjectAssign(
        {},
        entry,
        {objectives = __TS__ArrayMap(
            entry.objectives,
            function(____, objective) return __TS__ObjectAssign({}, objective) end
        )}
    )
end
function ____exports.listQuestEntries(self)
    local entries = __TS__ObjectValues(questLogState.entriesByQuestId)
    __TS__ArraySort(
        entries,
        function(____, a, b) return a.acceptedAtTick - b.acceptedAtTick end
    )
    return __TS__ArrayMap(
        entries,
        function(____, entry) return __TS__ObjectAssign(
            {},
            entry,
            {objectives = __TS__ArrayMap(
                entry.objectives,
                function(____, objective) return __TS__ObjectAssign({}, objective) end
            )}
        ) end
    )
end
function ____exports.listQuestsByCategory(self, category)
    return __TS__ArrayFilter(
        ____exports.listQuestEntries(nil),
        function(____, entry) return entry.category == category end
    )
end
function ____exports.listQuestsByStatus(self, status)
    return __TS__ArrayFilter(
        ____exports.listQuestEntries(nil),
        function(____, entry) return entry.status == status end
    )
end
function ____exports.setQuestStatus(self, questId, status)
    local entry = questLogState.entriesByQuestId[questId]
    if entry == nil then
        return nil
    end
    entry.status = status
    if status == "ready-to-turn-in" and entry.completedAtTick == nil then
        local ____questLogState_8, ____nextTick_9 = questLogState, "nextTick"
        local ____questLogState_nextTick_10 = ____questLogState_8[____nextTick_9]
        ____questLogState_8[____nextTick_9] = ____questLogState_nextTick_10 + 1
        entry.completedAtTick = ____questLogState_nextTick_10
    end
    if status == "completed" then
        if entry.completedAtTick == nil then
            local ____questLogState_11, ____nextTick_12 = questLogState, "nextTick"
            local ____questLogState_nextTick_13 = ____questLogState_11[____nextTick_12]
            ____questLogState_11[____nextTick_12] = ____questLogState_nextTick_13 + 1
            entry.completedAtTick = ____questLogState_nextTick_13
        end
        if entry.turnedInAtTick == nil then
            local ____questLogState_14, ____nextTick_15 = questLogState, "nextTick"
            local ____questLogState_nextTick_16 = ____questLogState_14[____nextTick_15]
            ____questLogState_14[____nextTick_15] = ____questLogState_nextTick_16 + 1
            entry.turnedInAtTick = ____questLogState_nextTick_16
        end
    end
    return ____exports.getQuestState(nil, questId)
end
local function areAllObjectivesCompleted(self, entry)
    if #entry.objectives == 0 then
        return false
    end
    return __TS__ArrayEvery(
        entry.objectives,
        function(____, objective) return objective.completed == true end
    )
end
local function hasAnyObjectiveProgress(self, entry)
    return __TS__ArraySome(
        entry.objectives,
        function(____, objective) return objective.currentCount > 0 end
    )
end
local function recomputeQuestStatusFromObjectives(self, entry)
    if entry.status == "completed" then
        return
    end
    if areAllObjectivesCompleted(nil, entry) then
        if entry.turnInNpcId ~= nil then
            entry.status = "ready-to-turn-in"
            if entry.completedAtTick == nil then
                local ____entry_20 = entry
                local ____questLogState_17, ____nextTick_18 = questLogState, "nextTick"
                local ____questLogState_nextTick_19 = ____questLogState_17[____nextTick_18]
                ____questLogState_17[____nextTick_18] = ____questLogState_nextTick_19 + 1
                ____entry_20.completedAtTick = ____questLogState_nextTick_19
            end
            return
        end
        entry.status = "completed"
        if entry.completedAtTick == nil then
            local ____entry_24 = entry
            local ____questLogState_21, ____nextTick_22 = questLogState, "nextTick"
            local ____questLogState_nextTick_23 = ____questLogState_21[____nextTick_22]
            ____questLogState_21[____nextTick_22] = ____questLogState_nextTick_23 + 1
            ____entry_24.completedAtTick = ____questLogState_nextTick_23
        end
        if entry.turnedInAtTick == nil then
            local ____entry_28 = entry
            local ____questLogState_25, ____nextTick_26 = questLogState, "nextTick"
            local ____questLogState_nextTick_27 = ____questLogState_25[____nextTick_26]
            ____questLogState_25[____nextTick_26] = ____questLogState_nextTick_27 + 1
            ____entry_28.turnedInAtTick = ____questLogState_nextTick_27
        end
        return
    end
    if hasAnyObjectiveProgress(nil, entry) and entry.status == "accepted" then
        entry.status = "in-progress"
    end
end
function ____exports.incrementObjectiveProgress(self, questId, objectiveId, amount)
    if amount == nil then
        amount = 1
    end
    local entry = questLogState.entriesByQuestId[questId]
    if entry == nil or entry.status == "completed" then
        local ____temp_29
        if entry == nil then
            ____temp_29 = nil
        else
            ____temp_29 = ____exports.getQuestState(nil, questId)
        end
        return ____temp_29
    end
    local increment = math.max(
        0,
        math.floor(amount)
    )
    if increment <= 0 then
        return ____exports.getQuestState(nil, questId)
    end
    local objective = __TS__ArrayFind(
        entry.objectives,
        function(____, candidate) return candidate.id == objectiveId end
    )
    if objective == nil or objective.completed then
        return ____exports.getQuestState(nil, questId)
    end
    objective.currentCount = math.min(objective.targetCount, objective.currentCount + increment)
    objective.completed = objective.currentCount >= objective.targetCount
    recomputeQuestStatusFromObjectives(nil, entry)
    return ____exports.getQuestState(nil, questId)
end
function ____exports.areObjectivesComplete(self, questId)
    local entry = questLogState.entriesByQuestId[questId]
    if entry == nil then
        return false
    end
    return areAllObjectivesCompleted(nil, entry)
end
function ____exports.isQuestReadyToTurnIn(self, questId)
    local ____opt_30 = questLogState.entriesByQuestId[questId]
    return (____opt_30 and ____opt_30.status) == "ready-to-turn-in"
end
function ____exports.turnInQuest(self, questId)
    local entry = questLogState.entriesByQuestId[questId]
    if entry == nil then
        return nil
    end
    if entry.status ~= "ready-to-turn-in" then
        return ____exports.getQuestState(nil, questId)
    end
    entry.status = "completed"
    if entry.completedAtTick == nil then
        local ____questLogState_32, ____nextTick_33 = questLogState, "nextTick"
        local ____questLogState_nextTick_34 = ____questLogState_32[____nextTick_33]
        ____questLogState_32[____nextTick_33] = ____questLogState_nextTick_34 + 1
        entry.completedAtTick = ____questLogState_nextTick_34
    end
    if entry.turnedInAtTick == nil then
        local ____questLogState_35, ____nextTick_36 = questLogState, "nextTick"
        local ____questLogState_nextTick_37 = ____questLogState_35[____nextTick_36]
        ____questLogState_35[____nextTick_36] = ____questLogState_nextTick_37 + 1
        entry.turnedInAtTick = ____questLogState_nextTick_37
    end
    return ____exports.getQuestState(nil, questId)
end
return ____exports
