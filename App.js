Ext.define('CustomApp', {
    extend: 'Rally.app.App'
    ,componentCls: 'app'
    ,printTitle: 'Boost Print Helper'
    ,styleSheetPath: 'print.css'
    ,remote: false
    ,rawStyle: 'html{background-color:#fff;color:#000;font:1em / 1.26 Arial,Helvetica,sans-serif;margin:0;padding:0}body{background-color:#fff;margin:0;padding:0}.pb{page-break-after:right;clear:both}.artifact{display:inline-block;position:relative;width:99%;background-color:#fff;border:.2em solid #000}.ratio-control{padding-top:65%}.card-frame{position:absolute;top:0;bottom:0;left:0;right:0}.header{border:.8em grey;border-bottom-style:solid;height:15%;vertical-align:middle;width:100%}.card-title{font:700 2.7em Genova,sans-serif;padding-left:.3em;padding-top:.5em}.description{float:left;font:1.4em Georgia,sans-serif;margin:.25em auto 0;padding-left:1em;padding-right:1em;padding-top:2em;overflow-y:hidden;word-wrap:break-word}.owner{float:right;height:2%}.ownerText{float:right;font:2.5em / 1.26 Arial,Helvetica,sans-serif;margin-right:.3em;margin-top:.4em}.storyID{float:left;font:3em / 1.26 Arial,Helvetica,sans-serif;margin-left:.25em;margin-top:.3em}.estimate{bottom:.2em;position:absolute;right:.5em;font:3em / 1.26 Arial,Helvetica,sans-serif}.content{height:80%;overflow:hidden;width:100%}'
    ,launch: function() {
        var self = this

        self.setRemote();
        self.buildTabs();
        self.buildIterationGrids();
    }

    ,setRemote: (function() {
        var self = this,
            url = window.location.origin,
            expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi,
            regex = new RegExp(expression);

        if (url.match(regex)) {
            self.remote = true;
        }
    })

    ,buildTabs: (function() {
        var self = this;

        var tab = Ext.create('Ext.tab.Panel', {
            activeTab: 0
            ,border: false
        });

        self.tab = tab;
        self.add(tab);
    })

    ,buildIterationGrids: (function() {
        var self = this,
            tab = self.tab;

        var storiesGrid = self.buildGrid('User Stories');
        var backlogGrid = self.buildGrid('Backlog', true);

        self.storiesGrid = storiesGrid;
        self.backlogGrid = backlogGrid;

        tab.add(storiesGrid);
        tab.add(backlogGrid);
        tab.setActiveTab(0);
    })

    ,buildGrid: (function(title, hideIteration) {
        var self = this;

        var store = Ext.create('Rally.data.WsapiDataStore', {
            model: 'User Story'
            ,autoLoad: hideIteration
        });

        return Ext.create('Ext.grid.Panel', {
            title: title
            ,store: store
            ,columns: [
                { xtype: 'rownumberer' }
                ,{ text: 'ID',  dataIndex: 'FormattedID', flex: 1 }
                ,{ text: 'Story Name', dataIndex: 'Name', flex: 3 }
            ]
            ,selModel: Ext.create('Ext.selection.CheckboxModel', {
                mode: 'MULTI'
                ,allowDeselect: true
            })
            ,columnLines: true
            ,border: false
            ,tbar: self.buildTbar(hideIteration)
            ,emptyText: 'No records found'
        });
    })

    ,buildTbar: (function(hideIteration) {
        var self = this,
            items = [];

        if (hideIteration) {
            items = ['->', {
                text: 'Print'
                ,handler: self.printIteration
                ,scope: self
            }];
        } else {
            var store = Ext.create('Rally.data.WsapiDataStore', {
                model: 'Iteration'
                ,fetch: true
            });

            var iterationBox = Ext.create('Ext.form.field.ComboBox', {
                store: store
                ,displayField: 'Name'
                ,valueField: 'ObjectID'
                ,triggerAction: 'all'
                ,listeners: {
                    scope: self
                    ,change: self.iterationCallback
                }
            });

            store.on('load', function(st) {
                iterationBox.setValue(st.getAt(0).get('ObjectID'));
            });

            store.load();

            items = [iterationBox, '->', {
                text: 'Print'
                ,handler: self.printIteration
                ,scope: self
            }];
        }

        return items;
    })

    ,setIterationBoxValue: (function(store, data, success) {
        var self = this,
            iterationBox = self.iterationBox,
            firstRecord = store.getAt(0);

        iterationBox.setValue(firstRecord);
    })

    ,iterationCallback: (function(cmb, recordId, oldVal, opts) {
        var self = this,
            storiesStore = self.storiesGrid.getStore();

        var filters = [{
            property: 'Iteration'
            ,operator: '='
            ,value: '/iteration/' + recordId
        }];

        storiesStore.reload({
            filters: filters
        });

        storiesStore.filter(filters);
    })

    ,printIteration: (function(cb) {
        var self = this,
            grid = cb.findParentByType('grid'),
            selections = grid.getSelectionModel().getSelection();

        if (selections.length > 0) {
            self.buildTemplate(selections);
        }
    })

    ,buildTemplate: (function(selections) {
        var self = this,
            data = self.sanitizeData(selections);

        var tpl = new Ext.XTemplate([
            '<tpl for="artifacts">',
                '<div class="artifact">',
                    '<div class="ratio-control">',
                        '<div class="card-frame">',
                            '<div class="header">',
                                '<span class="storyID">{id}</span>',
                                '<span class="ownerText">{owner}</span>',
                            '</div>',
                            '<div class="content">',
                                '<span class="card-title">{name}</span>',
                                '<span class="description">{description}</span>',
                            '</div>',
                            '<span class="estimate">{estimate}</span>',
                        '</div>',
                    '</div>',
                '</div>',
                '<div class="{defineBreak}"></div>',
            '</tpl>'
        ]);

        var markup = tpl.apply(data);

        self.printCards(markup);
    })

    ,printCards: (function(markup) {
        var self = this,
            options = 'toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500',
            win = window.open('', self.printTitle, options),
            doc = win.document;

        doc.write('<html><head><title>' + self.printTitle + '</title>');

        if (self.remote) {
            doc.write('<style>' + self.rawStyle + '</style>');
        } else {
            doc.write('<link href="' + self.styleSheetPath + '" rel="stylesheet" type="text/css" media="screen,print" />');
        }

        doc.write('</head><body class="landscape">');
        doc.write(markup);
        doc.write('</body></html>');
        doc.close();

        win.focus();
        win.print();
        return false;
    })

    ,sanitizeData: (function(selections) {
        var data = {
            artifacts: []
        };

        Ext.Array.each(selections, function(selection) {
            data.artifacts.push({
                name: selection.get('Name')
                ,description: selection.get('Description')
                ,id: selection.get('FormattedID')
                ,owner: selection.get('Owner')['_refObjectName']
                ,estimate: selection.get('PlanEstimate')
            })
        });

        return data;
    })
});
