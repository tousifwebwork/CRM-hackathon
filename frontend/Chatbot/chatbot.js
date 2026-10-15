import { getErrorMessage, sendChatMessage } from "../src/api";

export async function sendChat(history) {
	try {
		return await sendChatMessage(history);
	} catch (error) {
		throw new Error(getErrorMessage(error, "The AI assistant is unavailable right now."));
	}
}