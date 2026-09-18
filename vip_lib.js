//////////////////////////////////////////////////////////////////////

function VipObject()
{
	this.parent = null;
	this.div = null;
}

VipObject.prototype.createChild = function(parent, cls)
{
	this.div = document.createElement('div');
	this.div.vipobj = this;

	if (cls)
		this.div.className = cls;

	this.parent = parent;
	this.parent.div.appendChild(this.div);
}

VipObject.prototype.addClass = function(cls)
{
	this.div.classList.add(cls);
}

VipObject.prototype.hasClass = function(cls)
{
	return this.div.classList.contains(cls);
}

VipObject.prototype.ClearContent = function()
{
	if (this.div)
		this.div.innerHTML = "";
}

VipObject.prototype.Remove = function()
{
	if (this.div)
		this.parent.div.removeChild(this.div);
}

VipObject.prototype.First = function()
{
	var element = this.div.firstChild;
	
	if (element)
		return element.vipobj;

	return null;
}

VipObject.prototype.Last = function()
{
	var element = this.div.lastChild;
	
	if (element)
		return element.vipobj;

	return null;
}

VipObject.prototype.Next = function()
{
	var sib = this.div.nextSibling;
	
	if (sib)
		return sib.vipobj;
	
	return null;
}

VipObject.prototype.Prev = function()
{
	var sib = this.div.previousSibling;
	
	if (sib)
		return sib.vipobj;
	
	return null;
}

VipObject.prototype.setText = function(txt)
{
	this.div.textContent = txt;
}

VipObject.prototype.Show = function(showdiv)
{
	this.div.style.visibility = showdiv ? "visible" : "hidden";
}

VipObject.prototype.MoveLastBefore = function(vipsib)
{
	if (vipsib)
		this.div.insertBefore(this.div.removeChild(this.div.lastChild), vipsib.div);
}



//////////////////////////////////////////////////////////////////////

function VipDiv(parent, id)
{
	this.createChild(parent, id);
}

VipDiv.prototype = new VipObject;



//////////////////////////////////////////////////////////////////////

function VipGridConfig()
{
	this.multi_col_count = 6;
	this.multi_col_count_portrait = 3;
	this.auto_scroll = true;
	this.auto_scroll_offset = -1;
	this.first_month = 1;
	this.weekends = "6,0";
	this.first_day_of_week = 0;
	this.align_weekends = true;
	this.font_scale = 0.6;
	this.past_opacity = 0.7;
	this.month_names = "Jan-Feb-Mar-Apr-May-Jun-Jul-Aug-Sep-Oct-Nov-Dec";
	this.show_event_time = true;
	this.show_event_title = true;
	this.show_event_marker = true;
	this.colour_event_title = false;
	this.proportional_events = false;
	this.proportional_start_hour = 8;
	this.proportional_end_hour = 20;
	this.show_all_day_events = true;
	this.single_day_as_multi_day = false;
	this.show_timed_events = true;
	this.multi_day_as_single_day = false;
	this.first_day_only = false;
	this.marker_width = 0.8;
	this.multi_day_opacity = 0.8;
}



//////////////////////////////////////////////////////////////////////

var vipgrid;

function VipGrid(gid, cbid)
{
	vipgrid = this;

	this.div = document.getElementById(gid);
	if (!this.div) return;
	
	this.div.innerHTML = "";
	this.div.tabIndex = "1";

	this.addClass("vipgrid");
	this.cfg = new VipGridConfig();
	this.cellmax = 31;
	this.col_header = true;
	this.scrolling_disabled = false;
	this.time24h = true;
	this.evtsrc = null;
	this.selection = {enabled: false, drag: false, span: null};
	this.touch = {id: null, start: {x:0, y:0}};
	this.priority = null;
	this.lastWheelEvent = 0;
	this.enable_links = true;

	if (cbid)
		this.calbar = new VipCalendarBar(cbid);

	this.div.onmousedown = this.onmousedown.bind(this);
	this.div.onmousemove = this.onmousemove.bind(this);
	this.div.onmouseup = this.onmouseup.bind(this);
	this.div.onkeydown = this.onkeydown.bind(this);
	this.div.onwheel = this.onwheel.bind(this);

	this.div.addEventListener('touchstart', this.ontouchstart.bind(this), false);
	this.div.addEventListener('touchmove', this.ontouchmove.bind(this), false);
	this.div.addEventListener('touchend', this.ontouchend.bind(this), false);
	this.div.addEventListener('touchcancel', this.ontouchcancel.bind(this), false);

	window.onresize = this.onResize.bind(this);
}

VipGrid.prototype = new VipObject;

VipGrid.prototype.init = function()
{
	if (!this.div) return;
	var c = this.isPortrait() ? this.cfg.multi_col_count_portrait : this.cfg.multi_col_count;

	this.cache = {};
	this.cache.viewport = {start: c, len: c, init: c};
	this.cache.len = c*3;
	
	if (this.cfg.auto_scroll)
	{
		this.cache.month = this.cfg.auto_scroll_offset;
	}
	else
	{
		this.cache.month = ((this.cfg.first_month-1) - new Date().getMonth());
		if (this.cache.month > 0)
			this.cache.month -= 12;
	}

	this.cache.month -= this.cache.viewport.start;
	
	VipDate.weekends = this.cfg.weekends.split(',').map(s => parseInt(s));
	VipDate.localemonth = this.cfg.month_names.split('-');
	
	this.create();
}

VipGrid.prototype.create = function()
{
	this.ClearContent();
	
	var vdt = new VipDate();
	vdt.toStartOfMonth();
	vdt.offsetMonth(this.cache.month);

	for (var i=0; i < this.cache.len; i++)
	{
		var vipcol = new VipCol(this, vdt.ymd());
		vdt.offsetMonth(1);
	}

	this.updateViewport();
	this.updateLayout();
	this.ReloadEvents();
	this.div.focus();
}

VipGrid.prototype.updateLayout = function()
{
	var c = this.cellmax;
	if (this.col_header) c += 2;
	if (this.cfg.align_weekends) c += 6;

	var celloffset = Math.floor(this.div.offsetHeight/c);
	if (celloffset < 15) celloffset = 25; // Sécurité anti-hauteur nulle

	this.div.style.fontSize = ((celloffset/16) * this.cfg.font_scale) + "em";
	var fontsize = parseFloat(window.getComputedStyle(this.div).fontSize);
	var markerwidth = Math.floor(fontsize*this.cfg.marker_width) - 2;

	this.div.style.setProperty('--celloffset', celloffset + "px", this.priority);
	this.div.style.setProperty('--markerwidth', markerwidth + "px");
}

VipGrid.prototype.updateViewport = function()
{
	for (var i=0; i < this.div.childElementCount; i++)
	{
		if (i < this.cache.viewport.start)
			this.div.children[i].classList.add("buffer");
		else if (i >= (this.cache.viewport.start + this.cache.viewport.len))
			this.div.children[i].classList.add("buffer");
		else
			this.div.children[i].classList.remove("buffer");
	}
}

VipGrid.prototype.scroll = function(forward)
{
	if (this.scrolling_disabled) return;

	if (forward)
	{
		this.cache.viewport.start += 1;
		if (this.cache.viewport.start == (this.cache.len - this.cache.viewport.len))
		{
			while (this.cache.viewport.start != this.cache.viewport.init)
			{
				var vdt = new VipDate(this.Last().ymd);
				vdt.offsetMonth(1);
				var vipcol = new VipCol(this, vdt.ymd());

				if (this.selection.span)
					if (this.First() === this.selection.span.start.vipcol)
						this.cancel_selection();

				this.First().Remove();
				this.cache.viewport.start--;
			}
			this.ReloadEvents();
		}
	}
	else
	{
		this.cache.viewport.start += -1;
		if (this.cache.viewport.start == 0)
		{
			while (this.cache.viewport.start != this.cache.viewport.init)
			{
				var vdt = new VipDate(this.First().ymd);
				vdt.offsetMonth(-1);
				var vipcol = new VipCol(this, vdt.ymd());
				this.MoveLastBefore(this.First());

				if (this.selection.span)
					if (this.Last() === this.selection.span.end.vipcol)
						this.cancel_selection();

				this.Last().Remove();
				this.cache.viewport.start++;
			}
			this.ReloadEvents();
		}
	}

	this.updateViewport();
	this.render_selection(true);
}

VipGrid.prototype.isPortrait = function()
{
	var so = "n/a";
	if (screen.orientation && screen.orientation.type) so = screen.orientation.type;
	if (screen.msOrientation) so = screen.msOrientation;
	return so.includes("portrait");
}

VipGrid.prototype.getVipCell = function(ymd)
{
	var e = document.getElementById(ymd);
	if (e && e.vipobj instanceof VipCell)
		return e.vipobj;
	return null;
}

VipGrid.prototype.onResize = function() { this.updateLayout(); }

VipGrid.prototype.onkeydown = function(event)
{
	var cmd = "";
	switch (event.key)
	{
		case '+': case 'Add': cmd = "+"; break;
		case 'Enter': cmd = "enter"; break;
		case 'Escape': case 'Esc': cmd = "esc"; break;
		default:
			switch (event.keyCode)
			{
				case 37: case 38: cmd = "left"; break;
				case 39: case 40: cmd = "right"; break;
				case 107: cmd = "+"; break;
				case 13: cmd = "enter"; break;
				case 27: cmd = "esc"; break;
			}
	}

	switch (cmd)
	{
		case "+": this.setCellSelectMode(true); break;
		case "esc": this.setCellSelectMode(false); this.cancel_selection(); break;
		case "enter": this.confirm_selection(); break;
		case "left": this.scroll(false); break;
		case "right": this.scroll(true); break;
	}
	event.returnValue = false;
	event.preventDefault();
}

VipGrid.prototype.onwheel = function(event)
{
	var t = Math.floor(event.timeStamp);
	if ((t - this.lastWheelEvent) > 150)
	{
		this.scroll(event.deltaY > 0);
		this.lastWheelEvent = t;
	}
	event.preventDefault();
}

VipGrid.prototype.onmousedown = function(event)
{
	if (!this.selection.enabled) return;
	var targobj = event.target.vipobj;
	if (targobj instanceof VipCell)
	{
		if (this.selection.span && event.shiftKey)
			this.update_selection(targobj);
		else
			this.init_selection(targobj);
	}
}

VipGrid.prototype.onmousemove = function(event)
{
	if (!this.selection.enabled) return;
	var targobj = event.target.vipobj;
	if (targobj instanceof VipCell && this.selection.drag)
		this.update_selection(targobj);
}

VipGrid.prototype.onmouseup = function() { this.selection.drag = false; }

VipGrid.prototype.init_selection = function(vipcell)
{
	this.render_selection(false);
	this.selection.span = {start: vipcell, end: vipcell};
	this.selection.drag = true;
	this.render_selection(true);
}

VipGrid.prototype.update_selection = function(vipcell)
{
	var to_cell = vipcell.isBefore(this.selection.span.start) ? this.selection.span.start : vipcell;
	var col = to_cell.vipcol;
	if (col === this.selection.span.end.vipcol)
	{
		col.setSelHeight(to_cell);
		this.selection.span.end = to_cell;
		col.setSelTip(this.selection.span);
	}
	else
	{
		this.render_selection(false);
		this.selection.span.end = to_cell;
		this.render_selection(true);
	}
}

VipGrid.prototype.cancel_selection = function()
{
	this.render_selection(false);
	this.selection.span = null;
	this.selection.drag = false;
}

VipGrid.prototype.render_selection = function(show)
{
	if (this.selection.span)
	{
		var col = this.selection.span.start.vipcol;
		while (true)
		{
			var startcol = (col === this.selection.span.start.vipcol);
			var endcol = (col === this.selection.span.end.vipcol);
			if (show)
			{
				col.setSelTop(startcol ? this.selection.span.start : col.firstcell);
				col.setSelHeight(endcol ? this.selection.span.end : col.lastcell);
				col.setSelTip(endcol ? this.selection.span : null);
			}
			else
				col.setSelHeight(null);
			if (endcol) break;
			col = col.Next();
		}
	}
}

VipGrid.prototype.confirm_selection = function() { this.create_calendar_event(); }

VipGrid.prototype.setCellSelectMode = function(enable)
{
	var e = document.getElementById("vipcellselect");
	if (!e)
	{
		e = document.createElement('style');
		document.head.appendChild(e);
		e.id = "vipcellselect";
		e.sheet.insertRule(".vipgrid * {pointer-events: none;}", 0);
		e.sheet.insertRule(".vipgrid, .vipcell {cursor: cell; pointer-events: all;}", 1);
	}
	e.sheet.disabled = !enable;
	this.selection.enabled = enable;
}

VipGrid.prototype.create_calendar_event = function()
{
	if (this.selection.span)
	{
		var vdtStart = new VipDate(this.selection.span.start.ymd);
		var vdtEnd = new VipDate(this.selection.span.end.ymd);
		vdtEnd.offsetDay(1);
		window.open("https://www.google.com/calendar/r/eventedit?dates=" + vdtStart.ymdnum() + "/" + vdtEnd.ymdnum());
	}
}

VipGrid.prototype.ontouchstart = function(event)
{
	if (event.touches.length == 1)
	{
		var t = event.touches[0];
		this.touch.id = t.identifier;
		this.touch.start.x = t.pageX;
		this.touch.start.y = t.pageY;
	}
}

VipGrid.prototype.ontouchmove = function(event)
{
	if (event.touches.length != 1) { this.ontouchcancel(); return; }
	var t = event.touches[0];
	if (t.identifier != this.touch.id) { this.ontouchcancel(); return; }
	event.preventDefault();
}

VipGrid.prototype.ontouchend = function(event)
{
	if (event.changedTouches.length != 1) { this.ontouchcancel(); return; }
	var t = event.changedTouches[0];
	if (t.identifier != this.touch.id) { this.ontouchcancel(); return; }
	var dx = Math.abs(this.touch.start.x - t.pageX);
	var dy = Math.abs(this.touch.start.y - t.pageY);
	if (dy > dx && dy > 10)
	{
		if (this.touch.start.y > t.pageY) this.ReloadEvents();
		else this.SyncEvents();
	}
	else if (dx > 10)
	{
		this.scroll(this.touch.start.x > t.pageX);
	}
	this.ontouchcancel();
}

VipGrid.prototype.ontouchcancel = function() { this.touch.id = null; }

VipGrid.prototype.registerEventSource = function(src)
{
	src.forwardSetting = this.rcvCalSetting.bind(this);
	src.forwardEvent = this.rcvCalEvent.bind(this);
	src.forwardEventReloadReq = this.ReloadEvents.bind(this);
	this.evtsrc = src;
	if (this.calbar) this.calbar.registerCalendarSource(src);
}

VipGrid.prototype.rcvCalSetting = function(setting, value) { if (setting == "time24h") this.time24h = value; }
VipGrid.prototype.rcvCalEvent = function(evt) { if (evt.deleted) this.deleteGridEvent(evt.id); else this.createGridEvent(evt); }

VipGrid.prototype.createGridEvent = function(evt)
{
	var info = { id: evt.id, title: evt.title, colour: evt.colour, calendar: evt.calendar, calclass: evt.calclass, timed: evt.timed };
	if (evt.eid) info.htmlLink = evt.eid.substr(evt.eid.indexOf("eid=")+4);
	if (evt.timed)
	{
		if (!this.cfg.show_timed_events) return;
		info.vdttStart = new VipDateTime(evt.timespan.start);
		info.vdttEnd = new VipDateTime(evt.timespan.end);
		info.ymd = info.vdttStart.ymd();
		info.duration = VipDate.DaySpan(info.ymd, info.vdttEnd.ymd()) + 1;
	}
	else
	{
		if (!this.cfg.show_all_day_events) return;
		info.ymd = evt.datespan.start;
		info.duration = VipDate.DaySpan(evt.datespan.start, evt.datespan.end);
	}

	var vdt = new VipDate(info.ymd);
	var c = 0;
	while (c < info.duration)
	{
		var vipcell = this.getVipCell(vdt.ymd());
		if (vipcell)
		{
			var multi = (info.duration > 1);
			var single = !multi;
			if (multi) vipcell.vipcol.addEvent(info, vipcell);
			if (single) vipcell.addEvent(info);
		}
		vdt.offsetDay(1);
		c++;
	}
}

VipGrid.prototype.deleteGridEvent = function(id)
{
	while (true)
	{
		var e = document.getElementById(id);
		if (e) e.parentElement.removeChild(e);
		else return;
	}
}

VipGrid.prototype.ReloadEvents = function()
{
	if (this.evtsrc)
	{
		var vipcol = this.First();
		while (vipcol)
		{
			vipcol.vipevts.ClearContent();
			var vipcell = vipcol.vipcells.First();
			while (vipcell) { vipcell.vipevts.ClearContent(); vipcell = vipcell.Next(); }
			vipcol = vipcol.Next();
		}
		var vdt = new VipDate(this.Last().ymd);
		vdt.offsetMonth(1);
		this.evtsrc.datespan.dtStart = new Date(this.First().ymd);
		this.evtsrc.datespan.dtEnd = new Date(vdt.ymd());
		this.evtsrc.loadEvents();
	}
}

VipGrid.prototype.SyncEvents = function() { if (this.evtsrc && this.evtsrc.syncEvents) this.evtsrc.syncEvents(); }

VipGrid.prototype.getLocalStorage = function()
{
	if (window.localStorage && window.localStorage.vip) return JSON.parse(window.localStorage.vip);
	return {};
}

VipGrid.prototype.setLocalStorage = function(stg)
{
	if (window.localStorage) window.localStorage.vip = JSON.stringify(stg);
}



//////////////////////////////////////////////////////////////////////

function VipCol(parent, ymd)
{
	this.createChild(parent, "vipcol");
	this.vipcolcontent = new VipDiv(this, "vipcolcontent");
	var vdt = new VipDate(ymd);

	if (vipgrid.col_header)
	{
		this.viphdr = new VipDiv(this.vipcolcontent, "vipmonthhdr");
		this.viphdr.setText(vdt.MonthTitle());
		if (vipgrid.enable_links)
		{
			this.viphdr.div.onclick = this.onclickMonthHeader.bind(this);
			this.viphdr.addClass("viplink");
		}
	}

	this.offsetday = 0;
	if (vipgrid.cfg.align_weekends)
	{
		this.offsetday = vdt.DayOfWeek() - vipgrid.cfg.first_day_of_week;
		if (this.offsetday < 0) this.offsetday += 7;
	}

	this.vipcoloffset = new VipDiv(this.vipcolcontent, "vipcoloffset");
	this.vipcells = new VipDiv(this.vipcoloffset, "vipcells");
	
	var cellindex = 0;
	var month = vdt.getMonth();
	while (month == vdt.getMonth())
	{
		var vipcell = new VipCell(this.vipcells, this, vdt.ymd());
		vipcell.cellindex = cellindex;
		vdt.offsetDay(1);
		cellindex++;
	}

	this.vipsel = new VipDiv(this.vipcoloffset, "vipsel");
	this.vipsel.Show(false);
	this.vipevts = new VipDiv(this, "vipcolevts");

	this.ymd = ymd;
	this.firstcell = this.vipcells.First();
	this.lastcell = this.vipcells.Last();
}

VipCol.prototype = new VipObject;

VipCol.prototype.addEvent = function(info, vipcell)
{
	var vipevt = this.vipevts.First();
	while (vipevt)
	{
		if (vipevt.info.id == info.id) break;
		vipevt = vipevt.Next();
	}
	if (!vipevt) vipevt = new VipMultiDayEvent(this.vipevts, info, vipcell);
	vipevt.extend(vipcell);
	this.findFreeSlot(vipevt);
}

VipCol.prototype.findFreeSlot = function(vipevt)
{
	var vipsib = this.vipevts.First();
	while (vipsib)
	{
		if (vipevt !== vipsib && vipevt.slot == vipsib.slot && this.intersection(vipsib.index, vipsib.extent, vipevt.index, vipevt.extent))
		{
			vipevt.nextSlot();
			this.findFreeSlot(vipevt);
			return;
		}
		vipsib = vipsib.Next();
	}
}

VipCol.prototype.intersection = function(ai, ax, bi, bx)
{
	if (ai > bi) return ((bi + bx) >= ai);
	if (ai < bi) return ((ai + ax) >= bi);
	return true;
}

VipCol.prototype.setSelTop = function(vipcell) { if (vipcell) this.vipsel.div.style.top = vipcell.div.offsetTop + "px"; }
VipCol.prototype.setSelHeight = function(vipcell)
{
	if (vipcell)
	{
		this.vipsel.div.style.height = ((vipcell.div.offsetTop - this.vipsel.div.offsetTop) + vipcell.div.offsetHeight) + "px";
		this.vipsel.Show(true);
	}
	else { this.vipsel.Show(false); }
}

VipCol.prototype.setSelTip = function(sel)
{
	this.vipsel.ClearContent();
	if (sel && sel.start !== sel.end)
	{
		var c = VipDate.DaySpan(sel.start.ymd, sel.end.ymd);
		this.vipsel.setText(c.toString());
	}
}

VipCol.prototype.onclickMonthHeader = function()
{
	var vdt = new VipDate(this.ymd);
	window.open("https://www.google.com/calendar/r/month/" + vdt.GCalURL());
}



//////////////////////////////////////////////////////////////////////

function VipCell(parent, vipcol, ymd)
{
	this.createChild(parent, "vipcell");
	this.vipcol = vipcol;
	this.ymd = ymd;
	this.div.id = ymd;

	var vdt = new VipDate(ymd);
	if (vdt.isWeekend()) this.addClass("weekend");

	this.vipnum = new VipDiv(this, "vipcellnum");
	this.vipnum.setText(vdt.DayOfMonth());
	if (VipDate.isToday(ymd)) this.addClass("today");

	if (vipgrid.enable_links)
	{
		this.vipnum.div.onclick = this.onclickDayNumber.bind(this);
		this.vipnum.addClass("viplink");
	}
	
	// Bouton d'ajout d'événement cliquable directement
	this.vipaddbtn = new VipDiv(this, "vipaddbtn");
	this.vipaddbtn.setText("+");
	this.vipaddbtn.div.title = "Ajouter un événement";
	this.vipaddbtn.div.onclick = this.onclickAddButton.bind(this);

	this.vipevts = new VipDiv(this, "vipcellevts");
}

VipCell.prototype = new VipObject;

VipCell.prototype.isBefore = function(vipcell) { return (this.ymd < vipcell.ymd); }

VipCell.prototype.addEvent = function(info)
{
	var vipevt = this.vipevts.First();
	while (vipevt)
	{
		if (vipevt.info.id == info.id) return;
		vipevt = vipevt.Next();
	}
	if (!vipevt) vipevt = new VipSingleDayEvent(this.vipevts, info, this.ymd);

	var vipsib = this.vipevts.First();
	while (vipsib)
	{
		if (vipevt.timestamp < vipsib.timestamp) break;
		vipsib = vipsib.Next();
	}
	this.vipevts.MoveLastBefore(vipsib);
}

VipCell.prototype.onclickDayNumber = function(event)
{
	var vdt = new VipDate(this.ymd);
	window.open("https://www.google.com/calendar/r/week/" + vdt.GCalURL());
}

VipCell.prototype.onclickAddButton = function(event)
{
	if (event) event.stopPropagation();
	var vdtStart = new VipDate(this.ymd);
	var vdtEnd = new VipDate(this.ymd);
	vdtEnd.offsetDay(1);
	window.open("https://www.google.com/calendar/r/eventedit?dates=" + vdtStart.ymdnum() + "/" + vdtEnd.ymdnum());
};



//////////////////////////////////////////////////////////////////////

function VipMultiDayEvent(parent, info, vipcell)
{
	this.createChild(parent, "vipmultidayevent");
	if (info.calclass) this.addClass(info.calclass);
	if (vipgrid.enable_links) { this.div.onclick = this.edit.bind(this); this.addClass("viplink"); }

	this.info = info;
	this.div.id = info.id;
	this.div.style.backgroundColor = this.info.colour;
	this.index = vipcell.cellindex;
	this.extent = 0;
	this.setSlot(0);
}

VipMultiDayEvent.prototype = new VipObject;
VipMultiDayEvent.prototype.extend = function(vipcell) { this.extent = vipcell.cellindex - this.index + 1; }
VipMultiDayEvent.prototype.setSlot = function(i) { this.slot = i; }
VipMultiDayEvent.prototype.nextSlot = function() { this.setSlot(this.slot + 1); }
VipMultiDayEvent.prototype.edit = function()
{
	if (this.info.htmlLink) window.open("https://calendar.google.com/calendar/r/eventedit/" + this.info.htmlLink);
}



//////////////////////////////////////////////////////////////////////

function VipSingleDayEvent(parent, info, cellid)
{
	this.createChild(parent, "vipsingledayevent");
	if (info.calclass) this.addClass(info.calclass);
	if (vipgrid.enable_links) { this.div.onclick = this.edit.bind(this); this.addClass("viplink"); }

	this.div.id = info.id;
	this.info = info;
	this.cellid = cellid;
	this.timestamp = info.timed ? info.vdttStart.DayMinutes() : 0;

	if (vipgrid.cfg.show_event_title)
	{
		this.vipevttext = new VipDiv(this, "viptext");
		this.vipevttext.setText(info.title);
	}
}

VipSingleDayEvent.prototype = new VipObject;
VipSingleDayEvent.prototype.edit = function()
{
	if (this.info.htmlLink) window.open("https://calendar.google.com/calendar/r/eventedit/" + this.info.htmlLink);
}



//////////////////////////////////////////////////////////////////////

function VipCalendarBar(id)
{
	this.div = document.getElementById(id);
	if (this.div) this.div.innerHTML = "";
	this.addClass("vipcalbar");
}
VipCalendarBar.prototype = new VipObject;
VipCalendarBar.prototype.registerCalendarSource = function(src) { src.forwardCalendar = function(){}; }



//////////////////////////////////////////////////////////////////////

function VipDate(ymd)
{
	this.dt = new Date();
	this.dt.setHours(0,0,0,0);
	if (ymd)
		this.dt.setFullYear(parseInt(ymd.substr(0,4)), parseInt(ymd.substr(5,2))-1, parseInt(ymd.substr(8,2)));
}

VipDate.prototype.ymd = function()
{
	return this.dt.getFullYear() + VipDate.ymdstr[this.dt.getMonth()] + VipDate.ymdstr[this.dt.getDate()-1];
}

VipDate.prototype.ymdnum = function()
{
	return ((this.dt.getFullYear()*10000) + ((this.dt.getMonth()+1)*100) + this.dt.getDate());
}

VipDate.prototype.getMonth = function() { return this.dt.getMonth()+1; }
VipDate.prototype.offsetDay = function(off) { this.dt.setDate(this.dt.getDate() + off); }
VipDate.prototype.offsetMonth = function(off) { this.dt.setMonth(this.dt.getMonth() + off); }
VipDate.prototype.toStartOfMonth = function() { this.dt.setDate(1); }
VipDate.prototype.DayOfMonth = function() { return this.dt.getDate(); }
VipDate.prototype.DayOfWeek = function() { return this.dt.getDay(); }
VipDate.prototype.isWeekend = function() { return (VipDate.weekends.includes(this.dt.getDay())); }
VipDate.prototype.MonthTitle = function() { return VipDate.localemonth[this.dt.getMonth()] + " " + this.dt.getFullYear(); }
VipDate.prototype.GCalURL = function() { return this.dt.getFullYear() + "/" + (this.dt.getMonth()+1) + "/" + this.dt.getDate(); }

VipDate.ymdstr = ["-01", "-02", "-03", "-04", "-05", "-06", "-07", "-08", "-09", "-10",
	"-11", "-12", "-13", "-14", "-15", "-16", "-17", "-18", "-19", "-20",
	"-21", "-22", "-23", "-24", "-25", "-26", "-27", "-28", "-29", "-30", "-31"];

VipDate.weekends = [0, 6];
VipDate.localemonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
VipDate.ymdtoday = new VipDate().ymd();
VipDate.isToday = function(ymd) { return (ymd == VipDate.ymdtoday); }
VipDate.DaySpan = function(ymd1, ymd2) { return (Math.abs(Date.parse(ymd1) - Date.parse(ymd2))/86400000); }

function VipDateTime(iso) { this.dt = new Date(iso); }
VipDateTime.prototype = new VipDate;
VipDateTime.prototype.DayMinutes = function() { return ((this.dt.getHours()*60) + this.dt.getMinutes()); }

function fmt(fmtspec)
{
	var str = "";
	var arg = 1;
	for (var i in fmtspec)
	{
		if (fmtspec[i] == '^' && arg < arguments.length) { str += arguments[arg]; arg++; }
		else { str += fmtspec[i]; }
	}
	return str;
}
