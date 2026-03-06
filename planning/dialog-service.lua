local ____lualib = require("lualib_bundle")
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local ____exports = {}
local ____content_2Dregistry = require("planning.content-registry")
local getNpcById = ____content_2Dregistry.getNpcById
local listQuests = ____content_2Dregistry.listQuests
local ____quest_2Dlog = require("planning.quest-log")
local isQuestAccepted = ____quest_2Dlog.isQuestAccepted
local QUEST_PROMPTS_BY_NPC_ID = {}
local function buildQuestPromptMap(self)
    local quests = listQuests(nil)
    for ____, quest in ipairs(quests) do
        for ____, requirement in ipairs(quest.requirements) do
            do
                if requirement.kind ~= "npc-presence" then
                    goto __continue4
                end
                local npcId = requirement.metadata.npcId
                if type(npcId) ~= "string" then
                    goto __continue4
                end
                local bucket = QUEST_PROMPTS_BY_NPC_ID[npcId] or ({})
                bucket[#bucket + 1] = {questId = quest.id, questName = quest.name, prompt = "Quest offer: " .. quest.summary}
                QUEST_PROMPTS_BY_NPC_ID[npcId] = bucket
            end
            ::__continue4::
        end
    end
end
buildQuestPromptMap(nil)
function ____exports.getStandardDialogForNpc(self, npcId)
    local npc = getNpcById(nil, npcId)
    return {unpack(npc.standardDialog)}
end
function ____exports.getQuestDialogPromptsForNpc(self, npcId)
    local prompts = QUEST_PROMPTS_BY_NPC_ID[npcId] or ({})
    return __TS__ArrayMap(
        __TS__ArrayFilter(
            prompts,
            function(____, entry) return not isQuestAccepted(nil, entry.questId) end
        ),
        function(____, entry) return __TS__ObjectAssign({}, entry) end
    )
end
return ____exports
