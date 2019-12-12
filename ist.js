import { getAPI, getAuth, getUrlParameter } from "./ist.fn.api.js";
import {
    getAllTasks,
    getDueTasks,
    getSuggestTasksHTML
} from "./ist.fn.list.js";
import { getHighestPriorityTask, getTaskHTML } from "./ist.fn.task.js";
import { setEvents } from "./ist.fn.event.js";

$(document).ready(function() {
    async function asyncCall() {
        let authCode = getUrlParameter("code");
        if (authCode) {
            $("#task").append("logging into Todoist, please wait...");
            let authRaw = await getAuth(authCode);
            console.log("should come after auth call");
            //console.log(authRaw);
        }

        let todoistRawTasks = await getAPI("tasks");

        // create master task objects
        let allTasks = getAllTasks(todoistRawTasks),
            dueTasks = getDueTasks(allTasks);

        if (allTasks == "overdue") {
            throw "overdue";
        }

        let projects = await getAPI("projects");

        // checks first for 'routine' tasks in top project
        let highestPriorityTask = getHighestPriorityTask(dueTasks, projects);

        if (highestPriorityTask) {
            let todoistRawComments = await getAPI(
                "comments?task_id=" + highestPriorityTask.id
            );
            let mainTask = getTaskHTML(
                highestPriorityTask,
                projects,
                todoistRawComments
            );
            $("#task").append(mainTask);
        } else {
            sessionStorage.removeItem("project.id");
            let suggestTasks = getSuggestTasksHTML(
                allTasks,
                dueTasks,
                projects
            );
            $("#task").append(suggestTasks);
        }

        $("#spinner").hide();

        setEvents(dueTasks, allTasks);
    }
    asyncCall();
});
