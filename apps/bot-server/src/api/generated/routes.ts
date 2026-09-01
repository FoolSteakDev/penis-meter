/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UsersController } from './../controllers/users.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { RoundsController } from './../controllers/rounds.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { QuestsController } from './../controllers/quests.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { DuelSettingsController } from './../controllers/duel-settings.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ConditionsController } from './../controllers/conditions.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AchievementsController } from './../controllers/achievements.controller';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "UserWorkDto": {
        "dataType": "refObject",
        "properties": {
            "schedule": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "lastWeekend": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserTitleCodeDto": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["champion"]},{"dataType":"enum","enums":["silver"]},{"dataType":"enum","enums":["bronze"]},{"dataType":"enum","enums":["top10"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserTitleScopeDto": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["global"]},{"dataType":"enum","enums":["chat"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserTitleDto": {
        "dataType": "refObject",
        "properties": {
            "seasonNumber": {"dataType":"double","required":true},
            "rank": {"dataType":"double","required":true},
            "titleCode": {"ref":"UserTitleCodeDto","required":true},
            "scope": {"ref":"UserTitleScopeDto","required":true},
            "chatId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "awardedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "telegramId": {"dataType":"double","required":true},
            "username": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "firstName": {"dataType":"string","required":true},
            "value": {"dataType":"double","required":true},
            "lastMeasurementAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}],"required":true},
            "chats": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "work": {"ref":"UserWorkDto","required":true},
            "seasonGrowth": {"dataType":"double","required":true},
            "roundGrowth": {"dataType":"double","required":true},
            "roundBestDelta": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "roundMeasurementCount": {"dataType":"double","required":true},
            "titles": {"dataType":"array","array":{"dataType":"refObject","ref":"UserTitleDto"},"required":true},
            "mode": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["grow"]},{"dataType":"enum","enums":["drill"]}],"required":true},
            "modeChangedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}],"required":true},
            "experience": {"dataType":"double","required":true},
            "streakCurrent": {"dataType":"double","required":true},
            "streakBest": {"dataType":"double","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UsersListResponse": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"UserDto"},"required":true},
            "total": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserWorkRequest": {
        "dataType": "refObject",
        "properties": {
            "schedule": {"dataType":"array","array":{"dataType":"double"}},
            "lastWeekend": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserMode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["grow"]},{"dataType":"enum","enums":["drill"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserRequest": {
        "dataType": "refObject",
        "properties": {
            "value": {"dataType":"double"},
            "username": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "firstName": {"dataType":"string"},
            "work": {"ref":"UpdateUserWorkRequest"},
            "mode": {"ref":"UserMode"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RoundThemeSource": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["admin"]},{"dataType":"enum","enums":["random_fallback"]},{"dataType":"enum","enums":["legacy"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RoundDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "roundNumber": {"dataType":"double","required":true},
            "seasonNumber": {"dataType":"double","required":true},
            "roundInSeason": {"dataType":"double","required":true},
            "startsAt": {"dataType":"datetime","required":true},
            "endsAt": {"dataType":"datetime","required":true},
            "themeName": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "themeDescription": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "conditionCode": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "conditionChance": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "themeSource": {"dataType":"union","subSchemas":[{"ref":"RoundThemeSource"},{"dataType":"enum","enums":[null]}],"required":true},
            "isEditable": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateRoundRequest": {
        "dataType": "refObject",
        "properties": {
            "themeName": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "themeDescription": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "conditionCode": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "conditionChance": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QuestCategory": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["restraint"]},{"dataType":"enum","enums":["precision"]},{"dataType":"enum","enums":["position"]},{"dataType":"enum","enums":["luck"]},{"dataType":"enum","enums":["duel"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.unknown_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"any"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QuestDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "code": {"dataType":"string","required":true},
            "emoji": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "category": {"ref":"QuestCategory","required":true},
            "rule": {"dataType":"string","required":true},
            "target": {"dataType":"double","required":true},
            "params": {"ref":"Record_string.unknown_","required":true},
            "durationMinutes": {"dataType":"double","required":true},
            "rewardCm": {"dataType":"double","required":true},
            "penaltyCm": {"dataType":"double","required":true},
            "cooldownHours": {"dataType":"double","required":true},
            "isEnabled": {"dataType":"boolean","required":true},
            "sortOrder": {"dataType":"double","required":true},
            "activeAssignments": {"dataType":"double","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QuestKind": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["reach"]},{"dataType":"enum","enums":["avoid"]},{"dataType":"enum","enums":["hold"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QuestRuleParamDto": {
        "dataType": "refObject",
        "properties": {
            "key": {"dataType":"string","required":true},
            "label": {"dataType":"string","required":true},
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["number"]},{"dataType":"enum","enums":["string_list"]}],"required":true},
            "required": {"dataType":"boolean","required":true},
            "hint": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QuestRuleDto": {
        "dataType": "refObject",
        "properties": {
            "code": {"dataType":"string","required":true},
            "label": {"dataType":"string","required":true},
            "kind": {"ref":"QuestKind","required":true},
            "unit": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["count"]},{"dataType":"enum","enums":["cm"]},{"dataType":"enum","enums":["none"]}],"required":true},
            "params": {"dataType":"array","array":{"dataType":"refObject","ref":"QuestRuleParamDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QuestSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "isEnabled": {"dataType":"boolean","required":true},
            "announceEnabled": {"dataType":"boolean","required":true},
            "rewardMultiplier": {"dataType":"double","required":true},
            "penaltyMultiplier": {"dataType":"double","required":true},
            "maxActiveQuests": {"dataType":"double","required":true},
            "reminderBeforeMinutes": {"dataType":"double","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateQuestSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "isEnabled": {"dataType":"boolean"},
            "announceEnabled": {"dataType":"boolean"},
            "rewardMultiplier": {"dataType":"double"},
            "penaltyMultiplier": {"dataType":"double"},
            "maxActiveQuests": {"dataType":"double"},
            "reminderBeforeMinutes": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "QuestStatsEntryDto": {
        "dataType": "refObject",
        "properties": {
            "code": {"dataType":"string","required":true},
            "emoji": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "taken": {"dataType":"double","required":true},
            "completed": {"dataType":"double","required":true},
            "failed": {"dataType":"double","required":true},
            "cancelled": {"dataType":"double","required":true},
            "averageResolutionMinutes": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResetQuestsResponse": {
        "dataType": "refObject",
        "properties": {
            "affected": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResetQuestsRequest": {
        "dataType": "refObject",
        "properties": {
            "telegramId": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateQuestRequest": {
        "dataType": "refObject",
        "properties": {
            "code": {"dataType":"string","required":true},
            "emoji": {"dataType":"string"},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "category": {"ref":"QuestCategory","required":true},
            "rule": {"dataType":"string","required":true},
            "target": {"dataType":"double"},
            "params": {"ref":"Record_string.unknown_"},
            "durationMinutes": {"dataType":"double","required":true},
            "rewardCm": {"dataType":"double","required":true},
            "penaltyCm": {"dataType":"double","required":true},
            "cooldownHours": {"dataType":"double"},
            "isEnabled": {"dataType":"boolean"},
            "sortOrder": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateQuestRequest": {
        "dataType": "refObject",
        "properties": {
            "emoji": {"dataType":"string"},
            "name": {"dataType":"string"},
            "description": {"dataType":"string"},
            "category": {"ref":"QuestCategory"},
            "rule": {"dataType":"string"},
            "target": {"dataType":"double"},
            "params": {"ref":"Record_string.unknown_"},
            "durationMinutes": {"dataType":"double"},
            "rewardCm": {"dataType":"double"},
            "penaltyCm": {"dataType":"double"},
            "cooldownHours": {"dataType":"double"},
            "isEnabled": {"dataType":"boolean"},
            "sortOrder": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DuelSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "minDelta": {"dataType":"double","required":true},
            "maxDelta": {"dataType":"double","required":true},
            "isEnabled": {"dataType":"boolean","required":true},
            "challengeTtlMinutes": {"dataType":"double","required":true},
            "maxPendingChallenges": {"dataType":"double","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateDuelSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "minDelta": {"dataType":"double"},
            "maxDelta": {"dataType":"double"},
            "isEnabled": {"dataType":"boolean"},
            "challengeTtlMinutes": {"dataType":"double"},
            "maxPendingChallenges": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DeltaMode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["range"]},{"dataType":"enum","enums":["fixed_list"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConditionDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "code": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "isEnabled": {"dataType":"boolean","required":true},
            "chance": {"dataType":"double","required":true},
            "minDelta": {"dataType":"double","required":true},
            "maxDelta": {"dataType":"double","required":true},
            "deltaMode": {"ref":"DeltaMode","required":true},
            "fixedValues": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "config": {"ref":"Record_string.unknown_","required":true},
            "isProtected": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateConditionRequest": {
        "dataType": "refObject",
        "properties": {
            "code": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "isEnabled": {"dataType":"boolean"},
            "chance": {"dataType":"double","required":true},
            "deltaMode": {"ref":"DeltaMode"},
            "minDelta": {"dataType":"double"},
            "maxDelta": {"dataType":"double"},
            "fixedValues": {"dataType":"array","array":{"dataType":"double"}},
            "config": {"ref":"Record_string.unknown_"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateConditionRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string"},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "isEnabled": {"dataType":"boolean"},
            "chance": {"dataType":"double"},
            "deltaMode": {"ref":"DeltaMode"},
            "minDelta": {"dataType":"double"},
            "maxDelta": {"dataType":"double"},
            "fixedValues": {"dataType":"array","array":{"dataType":"double"}},
            "config": {"ref":"Record_string.unknown_"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AchievementSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "isEnabled": {"dataType":"boolean","required":true},
            "announceEnabled": {"dataType":"boolean","required":true},
            "rewardMultiplier": {"dataType":"double","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateAchievementSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "isEnabled": {"dataType":"boolean"},
            "announceEnabled": {"dataType":"boolean"},
            "rewardMultiplier": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AchievementDefinitionDto": {
        "dataType": "refObject",
        "properties": {
            "code": {"dataType":"string","required":true},
            "emoji": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "hint": {"dataType":"string","required":true},
            "category": {"dataType":"string","required":true},
            "unit": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["count"]},{"dataType":"enum","enums":["cm"]},{"dataType":"enum","enums":["days"]}],"required":true},
            "thresholds": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "rewards": {"dataType":"array","array":{"dataType":"double"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResetAchievementsResponse": {
        "dataType": "refObject",
        "properties": {
            "affected": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResetAchievementsRequest": {
        "dataType": "refObject",
        "properties": {
            "telegramId": {"dataType":"double"},
            "keepCounters": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsUsersController_listUsers: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                sortDir: {"default":"desc","in":"query","name":"sortDir","dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}]},
        };
        app.get('/users',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.listUsers)),

            async function UsersController_listUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_listUsers, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'listUsers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_updateUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateUserRequest"},
        };
        app.patch('/users/:id',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.updateUser)),

            async function UsersController_updateUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_updateUser, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'updateUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRoundsController_listRounds: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/rounds',
            ...(fetchMiddlewares<RequestHandler>(RoundsController)),
            ...(fetchMiddlewares<RequestHandler>(RoundsController.prototype.listRounds)),

            async function RoundsController_listRounds(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRoundsController_listRounds, request, response });

                const controller = new RoundsController();

              await templateService.apiHandler({
                methodName: 'listRounds',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRoundsController_createNextRound: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/rounds/next',
            ...(fetchMiddlewares<RequestHandler>(RoundsController)),
            ...(fetchMiddlewares<RequestHandler>(RoundsController.prototype.createNextRound)),

            async function RoundsController_createNextRound(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRoundsController_createNextRound, request, response });

                const controller = new RoundsController();

              await templateService.apiHandler({
                methodName: 'createNextRound',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRoundsController_updateRound: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateRoundRequest"},
        };
        app.patch('/rounds/:id',
            ...(fetchMiddlewares<RequestHandler>(RoundsController)),
            ...(fetchMiddlewares<RequestHandler>(RoundsController.prototype.updateRound)),

            async function RoundsController_updateRound(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRoundsController_updateRound, request, response });

                const controller = new RoundsController();

              await templateService.apiHandler({
                methodName: 'updateRound',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_listQuests: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/quests',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.listQuests)),

            async function QuestsController_listQuests(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_listQuests, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'listQuests',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_listRules: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/quests/rules',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.listRules)),

            async function QuestsController_listRules(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_listRules, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'listRules',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_getSettings: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/quests/settings',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.getSettings)),

            async function QuestsController_getSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_getSettings, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'getSettings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_updateSettings: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"UpdateQuestSettingsRequest"},
        };
        app.patch('/quests/settings',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.updateSettings)),

            async function QuestsController_updateSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_updateSettings, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'updateSettings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_getStats: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/quests/stats',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.getStats)),

            async function QuestsController_getStats(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_getStats, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'getStats',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_reset: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ResetQuestsRequest"},
        };
        app.post('/quests/reset',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.reset)),

            async function QuestsController_reset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_reset, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'reset',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_createQuest: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateQuestRequest"},
        };
        app.post('/quests',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.createQuest)),

            async function QuestsController_createQuest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_createQuest, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'createQuest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_updateQuest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateQuestRequest"},
        };
        app.patch('/quests/:id',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.updateQuest)),

            async function QuestsController_updateQuest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_updateQuest, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'updateQuest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsQuestsController_deleteQuest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/quests/:id',
            ...(fetchMiddlewares<RequestHandler>(QuestsController)),
            ...(fetchMiddlewares<RequestHandler>(QuestsController.prototype.deleteQuest)),

            async function QuestsController_deleteQuest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsQuestsController_deleteQuest, request, response });

                const controller = new QuestsController();

              await templateService.apiHandler({
                methodName: 'deleteQuest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsDuelSettingsController_getDuelSettings: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/duel-settings',
            ...(fetchMiddlewares<RequestHandler>(DuelSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(DuelSettingsController.prototype.getDuelSettings)),

            async function DuelSettingsController_getDuelSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDuelSettingsController_getDuelSettings, request, response });

                const controller = new DuelSettingsController();

              await templateService.apiHandler({
                methodName: 'getDuelSettings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsDuelSettingsController_updateDuelSettings: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"UpdateDuelSettingsRequest"},
        };
        app.patch('/duel-settings',
            ...(fetchMiddlewares<RequestHandler>(DuelSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(DuelSettingsController.prototype.updateDuelSettings)),

            async function DuelSettingsController_updateDuelSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDuelSettingsController_updateDuelSettings, request, response });

                const controller = new DuelSettingsController();

              await templateService.apiHandler({
                methodName: 'updateDuelSettings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsConditionsController_listConditions: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/conditions',
            ...(fetchMiddlewares<RequestHandler>(ConditionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConditionsController.prototype.listConditions)),

            async function ConditionsController_listConditions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConditionsController_listConditions, request, response });

                const controller = new ConditionsController();

              await templateService.apiHandler({
                methodName: 'listConditions',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsConditionsController_listAvailableCodes: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/conditions/available-codes',
            ...(fetchMiddlewares<RequestHandler>(ConditionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConditionsController.prototype.listAvailableCodes)),

            async function ConditionsController_listAvailableCodes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConditionsController_listAvailableCodes, request, response });

                const controller = new ConditionsController();

              await templateService.apiHandler({
                methodName: 'listAvailableCodes',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsConditionsController_createCondition: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateConditionRequest"},
        };
        app.post('/conditions',
            ...(fetchMiddlewares<RequestHandler>(ConditionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConditionsController.prototype.createCondition)),

            async function ConditionsController_createCondition(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConditionsController_createCondition, request, response });

                const controller = new ConditionsController();

              await templateService.apiHandler({
                methodName: 'createCondition',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsConditionsController_updateCondition: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateConditionRequest"},
        };
        app.patch('/conditions/:id',
            ...(fetchMiddlewares<RequestHandler>(ConditionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConditionsController.prototype.updateCondition)),

            async function ConditionsController_updateCondition(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConditionsController_updateCondition, request, response });

                const controller = new ConditionsController();

              await templateService.apiHandler({
                methodName: 'updateCondition',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsConditionsController_deleteCondition: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/conditions/:id',
            ...(fetchMiddlewares<RequestHandler>(ConditionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConditionsController.prototype.deleteCondition)),

            async function ConditionsController_deleteCondition(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConditionsController_deleteCondition, request, response });

                const controller = new ConditionsController();

              await templateService.apiHandler({
                methodName: 'deleteCondition',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAchievementsController_getSettings: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/achievements/settings',
            ...(fetchMiddlewares<RequestHandler>(AchievementsController)),
            ...(fetchMiddlewares<RequestHandler>(AchievementsController.prototype.getSettings)),

            async function AchievementsController_getSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAchievementsController_getSettings, request, response });

                const controller = new AchievementsController();

              await templateService.apiHandler({
                methodName: 'getSettings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAchievementsController_updateSettings: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"UpdateAchievementSettingsRequest"},
        };
        app.patch('/achievements/settings',
            ...(fetchMiddlewares<RequestHandler>(AchievementsController)),
            ...(fetchMiddlewares<RequestHandler>(AchievementsController.prototype.updateSettings)),

            async function AchievementsController_updateSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAchievementsController_updateSettings, request, response });

                const controller = new AchievementsController();

              await templateService.apiHandler({
                methodName: 'updateSettings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAchievementsController_getDefinitions: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/achievements/definitions',
            ...(fetchMiddlewares<RequestHandler>(AchievementsController)),
            ...(fetchMiddlewares<RequestHandler>(AchievementsController.prototype.getDefinitions)),

            async function AchievementsController_getDefinitions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAchievementsController_getDefinitions, request, response });

                const controller = new AchievementsController();

              await templateService.apiHandler({
                methodName: 'getDefinitions',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAchievementsController_reset: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ResetAchievementsRequest"},
        };
        app.post('/achievements/reset',
            ...(fetchMiddlewares<RequestHandler>(AchievementsController)),
            ...(fetchMiddlewares<RequestHandler>(AchievementsController.prototype.reset)),

            async function AchievementsController_reset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAchievementsController_reset, request, response });

                const controller = new AchievementsController();

              await templateService.apiHandler({
                methodName: 'reset',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
