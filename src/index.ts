import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';


function escapeTitleText(text: string) {
	return text.replace(/(\[|\])/g, '\\$1');
}

joplin.plugins.register({
	onStart: async function () {

		await joplin.settings.registerSection('convertTextToNewNoteSection', {
			label: 'Convert to New Note',
			iconName: 'fas fa-star',
		});
		await joplin.settings.registerSetting('converTextToNewNoteSettingsBacklink', {
			value: true,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Include backlink in new note',
		});

		await joplin.settings.registerSetting('converTextToNewNoteSettingsCopyTags', {
			value: true,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Copy tags to new note',
		});


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

				//Construct new note
				let backReference = `from [${escapeTitleText(note.title)}](:/${note.id})`

				//Get option
				const isBacklink = await joplin.settings.value('converTextToNewNoteSettingsBacklink');
				const isCopyTags = await joplin.settings.value('converTextToNewNoteSettingsCopyTags');


				let body = selectedText + "\n\n"

				if (isBacklink) {
					body = body + backReference
				}

				let title = selectedText.split('\n')[0];



				//Create new note
				let newnote = await joplin.data.post(['notes'], null, { body: body, title: title, parent_id: folder.id });

				//Get tags
				if (isCopyTags) {
					console.log('getting tags')



					let page = 1
					let tags
					let tagId
					let has_more = true
					while (has_more) {
						tags = await joplin.data.get(['notes', note.id, 'tags'], { page: page });
						tags.items.forEach(async element => {
							console.log(element)
							console.log(newnote.id)
							await joplin.data.post(['tags',element.id, 'notes'],null,{id:newnote.id});
						});
						if (tags.has_more) { page = page + 1 } else { has_more = false }

					}
				}


				//Create reference to new note
				await joplin.commands.execute('replaceSelection', `[${escapeTitleText(title)}](:/${newnote.id})`);


			}
		})
		// add accelerator
		await joplin.views.toolbarButtons.create('convertToNewNoteViaToolbar', 'convertTextToNewNote', ToolbarButtonLocation.EditorToolbar);
		await joplin.views.menuItems.create('convertToNewNoteViaMenu', 'convertTextToNewNote', MenuItemLocation.EditorContextMenu, {accelerator:"Ctrl+Alt+N"})
	}

});

