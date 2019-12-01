import { getAPI } from "./ist.fn.api.js";
import {
    getAllTasks,
    getDueTasks,
    getSuggestTasksHTML
} from "./ist.fn.list.js";
import { getHighestPriorityTask, getTaskHTML } from "./ist.fn.task.js";
import { setEvents } from "./ist.fn.event.js";

$(document).ready(function() {
    async function asyncCall() {
        let todoistRawTasks = await getAPI("tasks");

        // create master task objects
        let allTasks = getAllTasks(todoistRawTasks),
            dueTasks = getDueTasks(allTasks);

        let projects = await getAPI("projects");

        // checks first for 'routine' tasks in top project
        let highestPriorityTask = getHighestPriorityTask(
            dueTasks,
            projects.find(({ order }) => order === 1)
        );

        if (highestPriorityTask == undefined) {
            // check if a project has already been chosen for viewing
            let chosenProjectID = sessionStorage.getItem("project.id");

            if (chosenProjectID) {
                highestPriorityTask = getHighestPriorityTask(
                    dueTasks,
                    projects.find(({ id }) => id === Number(chosenProjectID))
                );
            }
        }

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
