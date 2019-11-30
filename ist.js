import { getAPI } from "./ist.fn.api.js";
import {
    getAllTasks,
    getDueTasks,
    getSuggestTasksHTML
} from "./ist.fn.list.js";
import {
    getHighestPrioritySelfCare,
    getTaskHTML,
    getSubTask
} from "./ist.fn.task.js";
import { setEvents } from "./ist.fn.event.js";

$(document).ready(function() {
    async function asyncCall() {
        let todoistRawTasks = await getAPI("tasks");

        //let todoistRawNotes = await getAPI("comments");

        let allTasks = getAllTasks(todoistRawTasks),
            dueTasks = getDueTasks(allTasks);

        let highestPrioritySelfCare = getHighestPrioritySelfCare(dueTasks);

        if (highestPrioritySelfCare == undefined) {
            let suggestTasks = getSuggestTasksHTML(allTasks, dueTasks);
            $("#task").append(suggestTasks);
        } else {
            let mainTask = getTaskHTML(highestPrioritySelfCare);
            $("#task").append(mainTask);

            let subTask = getSubTask(dueTasks, highestPrioritySelfCare);
            if (subTask != undefined) {
                let subTaskHTML = getTaskHTML(subTask);
                $("#task").append(subTaskHTML);
                $(".mainTask * .doneButton")
                    .first()
                    .remove();
            } else {
                if (highestPrioritySelfCare.special.type != undefined) {
                    $("#task").append(
                        "<div class='mainTask'>no subtasks</div>"
                    );
                }
            }
        }

        $("#spinner").hide();

        setEvents(dueTasks, allTasks);
    }
    asyncCall();
});
