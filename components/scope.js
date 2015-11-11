(function(){

var _ = Wysie.Scope = $.Class({
	extends: Wysie.Unit,
	constructor: function (element, wysie) {
		var me = this;

		this.type = _.normalize(this.element);

		this.collections = $$(Wysie.selectors.multiple, element).map(function(template) {
			return new Wysie.Collection(template, me.wysie);
		}, this);

		this.propertyNames = [];

		// Create Wysie objects for all properties in this scope, primitives or scopes, but not properties in descendant scopes
		this.properties.forEach(prop => {
			prop._.data.unit = _.super.create(prop, me.wysie);

			this.propertyNames.push(prop._.data.unit.property);
		});

		// Handle expressions
		this._cacheReferences();

		if (this.isRoot) {
			// TODO handle element templates in a better/more customizable way
			this.buttons = {
				edit: document.createElement("button")._.set({
					textContent: "✎",
					title: "Edit this " + this.type,
					className: "edit"
				}),
				savecancel: document.createElement("div")._.set({
					className: "wysie-buttons",
					contents: [{
						tag: "button",
						textContent: "Save",
						className: "save",
					}, {
						tag: "button",
						textContent: "Cancel",
						className: "cancel"
					}]
				})
			};

			this.element._.delegate({
				click: {
					"button.edit": this.edit.bind(this),
					"button.save": this.save.bind(this),
					"button.cancel": this.cancel.bind(this)
				},
				keyup: {
					"input": evt => {
						var code = evt.keyCode;

						if (code == 13) { // Enter
							this.save();
							evt.stopPropagation();
						}
						else if (code == 27) { // Esc
							this.cancel();
							evt.stopPropagation();
						}
					}
				}
			});

			// If root, add Save & Cancel button
			// TODO remove these after saving & cache, to reduce number of DOM elements lying around
			this.element.appendChild(this.buttons.edit);
		}
	},

	get isRoot() {
		return !this.property;
	},

	get properties () {
		// TODO cache this
		return $$(Wysie.selectors.property, this.element).filter(function(property){
			return this.element === property.parentNode.closest(Wysie.selectors.scope);
		}, this);
	},

	get data() {
		if (this.editing && !this.everSaved) {
			return null;
		}

		var ret = {};

		this.properties.forEach(function(prop){
			var unit = prop._.data.unit;

			ret[unit.property] = unit.data;
		});

		return ret;
	},

	stored: {
		editing: {
			set: function(value) {
				if (value) {
					this.element.setAttribute("data-editing", "");
				}
				else {
					this.element.removeAttribute("data-editing");
				}
			}
		}
	},

	edit: function() {
		this.editing = true;

		if (this.isRoot) {
			this.element.removeChild(this.buttons.edit);
			this.element.appendChild(this.buttons.savecancel);
		}

		this.properties.forEach(function(prop){
			prop._.data.unit.edit();
		});

		this.collections.forEach(function (collection){
			if (collection.length === 0) {
				var item = collection.add();

				item._.data.unit.edit();
			}
		});
	},

	save: function() {
		// TODO make this a class when we handle references properly in classes so we can toggle other classes
		this.editing = false;

		if (this.isRoot) {
			$.remove(this.buttons.savecancel);
			this.element.appendChild(this.buttons.edit);
		}

		this.properties.forEach(function(prop){
			prop._.data.unit.save();
		}, this);

		this.everSaved = true;

		this.wysie.save();
	},

	cancel: function() {
		if (this.isRoot) {
			$.remove(this.buttons.savecancel);
			this.element.appendChild(this.buttons.edit);
		}

		this.editing = false;

		this.properties.forEach(function(prop){
			prop._.data.unit.cancel();
		});
	},

	// Inject data in this element
	render: function(data) {
		if (!data) {
			return;
		}
		
		this.properties.forEach(function(prop){
			var property = prop._.data.unit;

			var datum = Wysie.queryJSON(data, prop.getAttribute("property"));

			if (datum) {
				property.render(datum);
			}

			property.save();
		});

		this.collections.forEach(function (collection){
			collection.render(data[collection.property]);
		});

		this.everSaved = true;
	},

	_cacheReferences: function() {
		this.refRegex = RegExp("(?:{" + this.propertyNames.join("|") + "})|(?:\\${.*(?:" + this.propertyNames.join("|") + ").*})", "gi");
		this.references = [];

		var extractRefs = (element, attribute) => {
			if (!attribute && element.children.length > 0) {
				return;
			}

			var text = attribute? attribute.value : element.textContent;
			var matches = text.match(this.refRegex);

			if (matches) {
				this.references.push({
					element: element,
					attribute: attribute && attribute.name,
					text: text,
					expressions: matches.map(match => match.replace(/^\$?{|}$/))
				});
			}
		};
		
		this.properties.forEach(prop => {
			if (this.refRegex.test(prop.outerHTML)) {
				extractRefs(prop, null);

				$$(prop.attributes).forEach(attribute => {
					extractRefs(prop, attribute);
				});
			}
		});
	},

	_updateReferences: function() {
		var data = this.data;

		$$(this.references).forEach(ref=>{
			$$(ref.expressions).forEach(expr=>{
				// TODO
			});
		});
	},

	static: {
		is: function(element) {

			var ret = Wysie.is("scope", element);

			if (!ret) {
				// Heuristic for matching scopes without a scoping attribute
				if ($$(Wysie.selectors.property, element).length) {
					// Contains other properties
					ret = Wysie.is("multiple", element)
						// content not in attribute
						|| !element.matches(Object.keys(Wysie.Primitive.types).filter(selector => {
							return !!Wysie.Primitive.types[selector].attribute;
						}).join(", "));
				}
			}

			return ret;
		},

		normalize: function(element) {
			// Get & normalize typeof name, if exists
			var type = element.getAttribute("typeof") || element.getAttribute("itemtype");

			if (!type && _.is(element)) {
				type = "Thing";
			}

			if (type) {
				element.setAttribute("typeof", type);
			}

			return type;
		},
	}
});

})();