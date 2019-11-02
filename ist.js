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
        console.time("getting tasks");
        let todoistRawTasks = await getAPI("items");
        console.timeEnd("getting tasks");

        console.time("getting notes");
        let todoistRawNotes = await getAPI("notes");
        console.timeEnd("getting notes");

        console.time("creating lists of tasks");
        let allTasks = getAllTasks(todoistRawTasks, todoistRawNotes),
            dueTasks = getDueTasks(allTasks);
        console.timeEnd("creating lists of tasks");

        console.time("picking highest-priority task");
        let highestPrioritySelfCare = getHighestPrioritySelfCare(dueTasks);
        console.timeEnd("picking highest-priority task");

        if (highestPrioritySelfCare == undefined) {
            console.time("generating suggested tasks");
            let suggestTasks = getSuggestTasksHTML(allTasks, dueTasks);
            $("#task").append(suggestTasks);
            console.timeEnd("generating suggested tasks");
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
