import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';
import { type } from 'os';


function escapeTitleText(text: string) {
	return text.replace(/(\[|\])/g, '\\$1');
}

joplin.plugins.register({
	onStart: async function () {
		const dialogs = joplin.views.dialogs;
		const handle3 = await dialogs.create('myDialog3');

		await joplin.settings.registerSection('convertTextToNewNoteSection', {
			label: 'Convert to New Note',
			iconName: 'fas fa-star',
		});
		await joplin.settings.registerSettings({'converTextToNewNoteSettingsBacklink': {
			value: true,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Include backlink in new note',
    }, 'converTextToNewNoteSettingsCopyTags': {
			value: true,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Copy tags to new note',
    }, 'converTextToNewNoteSettingsAskForTitle': {
			value: 5,
			type: 1,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Number of words to trigger title pop-up (0 = always ask)',
		}, 'converTextToNewNoteSettingsBacklinkText': {
			value: 'from ',
			type: 2,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Text to appear before backlink in new note',
		}, 'converTextToNewNoteSettingsNoteType': {
			value: 'note',
			type: 2,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Default type of note - "todo" or "note"',
    }, 'converTextToNewNoteSettingsGoToNew': {
			value: true,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: 'Switches to newly created note',
    }, 'converTextToNewNoteSettingsInsertTitle': {
			value: false,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: "Don't insert title at the top of body (first line of text)",
    }, 'converTextToNewNoteSettingsCreateSubNotebook': {
			value: false,
			type: 3,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: "Create subnotebooks for converted snippets based on title of origin note",
		}, 'converTextToNewNoteSettingsCreateSubNotebookPrefix': {
			value: "Extracts from ",
			type: 2,
			section: 'convertTextToNewNoteSection',
			public: true,
			label: "Prefix for tags of notes in subnotebooks ",
    }});
		await joplin.commands.register({
			name: 'convertTextToNewNote',
			label: 'Convert text to new note',
			iconName: 'fas fa-file-import',
			execute: async () => {
				//Get selected text
				const selectedText = (await joplin.commands.execute('selectedText') as string);

				//Get active note
				const note = await joplin.workspace.selectedNote();

				// Get active folder
				const folder = await joplin.data.get(['folders', note.parent_id]);
				let noteParentId = folder.id



				//Get option
				const isBacklink = await joplin.settings.value('converTextToNewNoteSettingsBacklink');
				const isCopyTags = await joplin.settings.value('converTextToNewNoteSettingsCopyTags');
				const isDialog = await joplin.settings.value('converTextToNewNoteSettingsAskForTitle')
				const isSwitchToNew = await joplin.settings.value('converTextToNewNoteSettingsGoToNew')
				const isCreateSubnotebook = await joplin.settings.value('converTextToNewNoteSettingsCreateSubNotebook')
				let createSubnotebookPrefix = await joplin.settings.value('converTextToNewNoteSettingsCreateSubNotebookPrefix')
				let backReferenceText = await joplin.settings.value('converTextToNewNoteSettingsBacklinkText')
				let noteOrTodo = await joplin.settings.value('converTextToNewNoteSettingsNoteType');
				let dontInsertTitle = await joplin.settings.value('converTextToNewNoteSettingsInsertTitle');

				//Construct new note

				let backReference = `${backReferenceText} [${escapeTitleText(note.title)}](:/${note.id})`
				let body = selectedText + "\n\n"
				if (isBacklink) {
					body = body + backReference
				}

				let title
				let newNotebookTitle
				let createOrNot = false
				if (isDialog > selectedText.split('\n')[0].split(" ").length) {
					title = selectedText.split('\n')[0];
					createOrNot = true

				} else {


					title = body.split('\n')[0];
					let cacheBust = Math.random();
					await dialogs.setButtons(handle3, [
						{
							id: 'ok',
						},
						{
							id: 'cancel',
						}
					]);
					let subnotebookForm="";
					let subnoteBookTitle=""
					if(isCreateSubnotebook){
						subnotebookForm = `
						<p>Subnotebook title</p>
						<input id="createNewSubnotebookTitle" type="text" value="${subnoteBookTitle.replace(/\"/g, '\'')}" name="subnotebooktitle">
						`
					}
					await dialogs.setHtml(handle3, `
		<p>Provide title</p>
		<form name="titleForm">
					<input type="hidden" name="rand" value='${cacheBust}' >
			<input id="createNewTitle" type="text" value="${title.replace(/\"/g, '\'')}" name="title">
			
		</form>
		<style src="#" onload="document.getElementById('createNewTitle').focus()"></style>

		`);

					let result3 = await dialogs.open(handle3);
					//alert(JSON.stringify(result3))


					title = result3.formData.titleForm.title
					if (result3.id == "cancel") {
						createOrNot = false
					} else {
						createOrNot = true
						if (!dontInsertTitle) {
							let bodyArr = body.split("\n")
							bodyArr.splice(0, 0, title + "\n")
							body = bodyArr.join("\n")
						}
					}

				}

				
				let subTag
				// Create subnotebooks and tag if it doesn't exists.
				if(isCreateSubnotebook){
					
					let px = createSubnotebookPrefix
					
					let firsNotebook
					let notebooks = await joplin.data.get(["search"], {
						query: escapeTitleText(note.title),
						type:"folder",
						fields: "id, title, parent_id"
					  });
					console.log("subnotebooks before creating")
					console.log(notebooks)
					if(notebooks.items.length>0){
						//get
						console.log("get notebook")
						let createNewSub = true
						for(let i=0;i<notebooks.items.length;i++)
						{ // check for subnotebooks under same parent
							if(notebooks.items[i].parent_id==note.parent_id){
								// notebook exists in this parent, get it

								firsNotebook= notebooks.items[i]
								console.log(firsNotebook)
								noteParentId = firsNotebook.id
								
								createNewSub = false

							} else{
								// this notebook is other parents
								

							}

							
						}
						
						if(createNewSub){
							// same titled subnotebooks exists but in other parents
							// so create new in this parent
							//create
						let newNotebook = await joplin.data.post(['folders'], null, { title: escapeTitleText(note.title), parent_id: folder.id});
						noteParentId = newNotebook.id
						console.log("new notebook for subnotebook")
						console.log(newNotebook)
						}

						
					}else{
						//create
						let newNotebook = await joplin.data.post(['folders'], null, { title: escapeTitleText(note.title), parent_id: folder.id});
						noteParentId = newNotebook.id
						console.log("new notebook for subnotebook")
						console.log(newNotebook)

					}
					let tagTitle = px+" " + folder.title
					let subTags = await joplin.data.get(['search'], {
						query:escapeTitleText(tagTitle),
						type:'tag',
						fields: 'id, title'
					  });
					if(subTags.items.length>0){
						subTag = subTags.items[0]
					}else{
						subTag = await joplin.data.post(['tags'], null, { title: escapeTitleText(tagTitle) });
					}

				}

				//Create new note
				if (createOrNot) {
					let newnote
					if (noteOrTodo.trim() == "todo") {
						newnote = await joplin.data.post(['notes'], null, { is_todo: 1, body: body, title: escapeTitleText(title), parent_id: noteParentId });
					} else {
						newnote = await joplin.data.post(['notes'], null, { body: body, title: escapeTitleText(title), parent_id: noteParentId });
					}



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
					// Add tag if if its in subnotebook
					if(isCreateSubnotebook){
						await joplin.data.post(['tags', subTag.id, 'notes'], null, { id: newnote.id });
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

		await joplin.views.menuItems.create('convertToNewNoteViaMenu', 'convertTextToNewNote', MenuItemLocation.EditorContextMenu, { accelerator: "Ctrl+Alt+N" });
		await joplin.views.menus.create('myMenu', 'Create Note From Text', [
			{
				commandName: "convertTextToNewNote",
				accelerator: "Ctrl+Alt+N"
			}
		]);
	}

});

