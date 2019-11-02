import { getAPI } from "./ist.fn.api.js";
import {
    getAllTasks,
    getDueTasks,
    getSuggestTasksHTML
} from "./ist.fn.list.js";
import {
    getHighestPrioritySelfCare,
    getTaskHTML,
    getSubTask,
    getTaskNotesHTML
} from "./ist.fn.task.js";
import { setEvents } from "./ist.fn.event.js";

$(document).ready(function() {
    async function asyncCall() {
        let todoistRawTasks = await getAPI("items"),
            todoistRawNotes = await getAPI("notes");

        let overdueTasks = _.filter(todoistRawTasks, function(task) {
            if (task.due != undefined) {
                // for date comparison, use getDueTasks from list.js
                // let todayDate = new Date($.now());
                // console.log(task.due.date);
                // return task.due.date < todayDate;
            }
        });
        console.log(overdueTasks);
        if (overdueTasks != undefined) {
            // $("#task").append("rescheduling overdue tasks, please wait...");
            //let todoistOverdueTasks = underscore function for getting past-due tasks from todoistRawTasks;
            //each todoistOverdueTasks, figure out time logic and update to today
            //if no time, change date to today
            //     if fixed time (e.g. 9pm), look at repeat rule, change date to today and time to repeat rule
            //     if circulating time (e.g. 1 hour), either set custom rules or set all to 6am
            // sync to server
            // refresh page
        }

        let allTasks = getAllTasks(todoistRawTasks, todoistRawNotes),
            dueTasks = getDueTasks(allTasks),
            highestPrioritySelfCare = getHighestPrioritySelfCare(dueTasks);

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
