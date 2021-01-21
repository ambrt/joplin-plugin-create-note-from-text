import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';


function escapeTitleText(text: string) {
	return text.replace(/(\[|\])/g, '\\$1');
}

joplin.plugins.register({
	onStart: async function () {
		const dialogs = joplin.views.dialogs;
		const handle3= await dialogs.create('myDialog3');
		
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

		await joplin.settings.registerSetting('converTextToNewNoteSettingsAskForTitle', {
			value: false,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Ask for title if two or more lines are selected ',
		});

		await joplin.settings.registerSetting('converTextToNewNoteSettingsGoToNew', {
			value: true,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Switches to newly created note',
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



				//Get option
				const isBacklink = await joplin.settings.value('converTextToNewNoteSettingsBacklink');
				const isCopyTags = await joplin.settings.value('converTextToNewNoteSettingsCopyTags');
				const isDialog = await joplin.settings.value('converTextToNewNoteSettingsAskForTitle')
				const isSwitchToNew = await joplin.settings.value('converTextToNewNoteSettingsGoToNew')

				//Construct new note
				let backReference = `from [${escapeTitleText(note.title)}](:/${note.id})`
				let body = selectedText + "\n\n"
				if (isBacklink) {
					body = body + backReference
				}

				let title
				let createOrNot = false
				if (selectedText.split('\n').length == 1) {
					title = selectedText.split('\n')[0];
					createOrNot = true

				} else if (isDialog) {
					

					title = body.split('\n')[0];
					let cacheBust = Math.random();
					await dialogs.setHtml(handle3, `
		<p>Provide title</p>
		<form name="titleForm">
					<input type="hidden" name="rand" value='${cacheBust}'/>
			<input type="text" value="${title.replace(/\"/g, '\'')}" name="title"/>
		</form>
		`);

					let result3 = await dialogs.open(handle3);


					title = result3.formData.titleForm.title
					if(result3.id=="cancel"){
						createOrNot = false
					} else{
						createOrNot = true
					let bodyArr = body.split("\n")
					bodyArr.splice(0, 0, title)
					body = bodyArr.join("\n")
				}

				} else {
					title = selectedText.split('\n')[0];
					createOrNot = true
				}




				//Create new note
				if(createOrNot){
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
							await joplin.data.post(['tags', element.id, 'notes'], null, { id: newnote.id });
						});
						if (tags.has_more) { page = page + 1 } else { has_more = false }

					}
				}


				//Create reference to new note
				await joplin.commands.execute('replaceSelection', `[${escapeTitleText(title)}](:/${newnote.id})`);
				if (isSwitchToNew) {
					await joplin.commands.execute('openNote', newnote.id);
				}
			}

			}
		})
		// add accelerator
		await joplin.views.toolbarButtons.create('convertToNewNoteViaToolbar', 'convertTextToNewNote', ToolbarButtonLocation.EditorToolbar);
		await joplin.views.menuItems.create('convertToNewNoteViaMenu', 'convertTextToNewNote', MenuItemLocation.EditorContextMenu, { accelerator: "Ctrl+Alt+N" })
	}

});

