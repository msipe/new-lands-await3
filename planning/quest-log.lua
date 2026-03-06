local ____lualib = require("lualib_bundle")
local __TS__ObjectKeys = ____lualib.__TS__ObjectKeys
local ____exports = {}
local questLogState = {acceptedQuestIds = {}}
function ____exports.resetQuestLogForNewRun(self)
    questLogState.acceptedQuestIds = {}
end
function ____exports.acceptQuest(self, questId)
    questLogState.acceptedQuestIds[questId] = true
end
function ____exports.isQuestAccepted(self, questId)
    return questLogState.acceptedQuestIds[questId] == true
end
function ____exports.getAcceptedQuestIds(self)
    return __TS__ObjectKeys(questLogState.acceptedQuestIds)
end
return ____exports
