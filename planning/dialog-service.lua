local ____lualib = require("lualib_bundle")
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local ____exports = {}
local ____content_2Dregistry = require("planning.content-registry")
local getNpcById = ____content_2Dregistry.getNpcById
local getQuestById = ____content_2Dregistry.getQuestById
local listQuests = ____content_2Dregistry.listQuests
local ____quest_2Dlog = require("planning.quest-log")
local isQuestAccepted = ____quest_2Dlog.isQuestAccepted
local listQuestEntries = ____quest_2Dlog.listQuestEntries
local QUEST_OFFERS_BY_NPC_ID = {}
local function buildQuestPromptMap(self)
    local quests = listQuests(nil)
    for ____, quest in ipairs(quests) do
        do
            if quest.offerNpcId == nil then
                goto __continue3
            end
            local bucket = QUEST_OFFERS_BY_NPC_ID[quest.offerNpcId] or ({})
            bucket[#bucket + 1] = {
                kind = "offer",
                questId = quest.id,
                questName = quest.name,
                recommendedLevel = quest.recommendedLevel,
                playerLine = quest.conversationStarter or ("Do you have work related to " .. quest.name) .. "?",
                prompt = (quest.name .. ": ") .. quest.summary
            }
            QUEST_OFFERS_BY_NPC_ID[quest.offerNpcId] = bucket
        end
        ::__continue3::
    end
end
buildQuestPromptMap(nil)
function ____exports.getStandardDialogForNpc(self, npcId)
    local npc = getNpcById(nil, npcId)
    return {unpack(npc.standardDialog)}
end
function ____exports.getQuestDialogPromptsForNpc(self, npcId)
    local prompts = {}
    local offers = QUEST_OFFERS_BY_NPC_ID[npcId] or ({})
    for ____, offer in ipairs(offers) do
        do
            if isQuestAccepted(nil, offer.questId) then
                goto __continue8
            end
            prompts[#prompts + 1] = __TS__ObjectAssign({}, offer)
        end
        ::__continue8::
    end
    local readyToTurnIn = __TS__ArrayFilter(
        listQuestEntries(nil),
        function(____, entry) return entry.turnInNpcId == npcId and entry.status == "ready-to-turn-in" end
    )
    for ____, entry in ipairs(readyToTurnIn) do
        prompts[#prompts + 1] = {
            kind = "turn-in",
            questId = entry.questId,
            questName = entry.questName,
            recommendedLevel = getQuestById(nil, entry.questId).recommendedLevel,
            playerLine = ("I've finished " .. entry.questName) .. ".",
            prompt = "Turn in: " .. entry.questName
        }
    end
    return prompts
end
return ____exports
