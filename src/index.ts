import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';


function escapeTitleText(text: string) {
	return text.replace(/(\[|\])/g, '\\$1');
}

joplin.plugins.register({
	onStart: async function () {
		await joplin.commands.register({
			name: 'convertTextToNewNote',
			label: 'Convert text to new note',
			iconName: 'fas fa-star',
			execute: async () => {
				//Get selected text
				const selectedText = (await joplin.commands.execute('selectedText') as string);

				//Get active note
				const note = await joplin.workspace.selectedNote();

				// Get active folder
				const folder = await joplin.data.get(['folders', note.parent_id]);
				let backReference = `from [${escapeTitleText(note.title)}](:/${note.id})`
				let body = selectedText+"\n\n"+backReference;
				let title = selectedText.split('\n')[0];

				let newnote = await joplin.data.post(['notes'], null, { body: body, title: title, parent_id: folder.id });
				await joplin.commands.execute('replaceSelection', `[${escapeTitleText(title)}](:/${newnote.id})`);


			}
		})
		await joplin.views.toolbarButtons.create('convertToNewNoteViaToolbar','convertTextToNewNote', ToolbarButtonLocation.EditorToolbar);
		await joplin.views.menuItems.create('convertToNewNoteViaMenu','convertTextToNewNote',MenuItemLocation.EditorContextMenu)
	}

});

