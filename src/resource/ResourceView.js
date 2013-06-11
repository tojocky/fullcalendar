
setDefaults({
	weekMode: 'fixed'
});


function ResourceView(element, calendar, viewName) {
	var t = this;
	
	
	// exports
	t.renderBasic = renderBasic;
	t.setHeight = setHeight;
	t.setWidth = setWidth;
	t.renderDayOverlay = renderDayOverlay;
	t.defaultSelectionEnd = defaultSelectionEnd;
	t.renderSelection = renderSelection;
	t.clearSelection = clearSelection;
	t.reportDayClick = reportDayClick; // for selection (kinda hacky)
	t.dragStart = dragStart;
	t.dragStop = dragStop;
	t.defaultEventEnd = defaultEventEnd;
	t.getHoverListener = function() { return hoverListener };
	t.colContentLeft = colContentLeft;
	t.colContentRight = colContentRight;
	t.dayOfWeekCol = dayOfWeekCol;
	t.timeOfDayCol = timeOfDayCol;
	t.dateCell = dateCell;
	t.cellDate = cellDate;
	t.cellIsAllDay = function() { return true };
	t.allDayRow = allDayRow;
	t.allDayBounds = allDayBounds;
	t.getRowCnt = function() { return rowCnt };
	t.getColCnt = function() { return colCnt };
	t.getResources = calendar.fetchResources();
	t.getColWidth = function() { return colWidth };
	t.getViewName = function() { return viewName };
	t.getDaySegmentContainer = function() { return daySegmentContainer };
	
	
	// imports
	View.call(t, element, calendar, viewName);
	OverlayManager.call(t);
	SelectionManager.call(t);
	ResourceEventRenderer.call(t);
	var opt = t.opt;
	var trigger = t.trigger;
	var clearEvents = t.clearEvents;
	var renderOverlay = t.renderOverlay;
	var clearOverlays = t.clearOverlays;
	var formatDate = calendar.formatDate;
	
	// locals
	var head;
	var headCells;
	var body;
	var bodyRows;
	var bodyCells;
	var bodyFirstCells;
	var bodyCellTopInners;
	var daySegmentContainer;
	
	var viewWidth;
	var viewHeight;
	var colWidth;
	
	var rowCnt, colCnt, getResources;
	var coordinateGrid;
	var hoverListener;
	var colContentPositions;
	
	var rtl, dis, dit;
	var firstDay;
	var nwe;
	var tm;
	var colFormat;
	
	
	
	/* Rendering
	------------------------------------------------------------*/
	
	
	disableTextSelection(element.addClass('fc-grid'));
	
	
	function renderBasic(maxr, r, c, showNumbers) {
		rowCnt = r;
		colCnt = c;

		updateOptions();
		var firstTime = !body;
		if (firstTime || viewName == 'resourceMonth') {
			buildSkeleton(maxr, showNumbers);
		}else{
			clearEvents();
		}
		updateCells(firstTime);
	}
	
	
	
	function updateOptions() {
		rtl = opt('isRTL');
		if (rtl) {
			dis = -1;
			dit = colCnt - 1;
		}else{
			dis = 1;
			dit = 0;
		}
		firstDay = opt('firstDay');
		nwe = opt('weekends') ? 0 : 1;
		tm = opt('theme') ? 'ui' : 'fc';
		colFormat = opt('columnFormat');
	}
	
	
	
	function buildSkeleton(maxRowCnt, showNumbers) {
		var s;
		var headerClass = tm + "-widget-header";
		var contentClass = tm + "-widget-content";
		var i, j, id, resourceName;
		var table;
		var resources = t.getResources;
		s =
			"<table class='fc-border-separate' style='width:100%' cellspacing='0'>" +
			"<thead>" +
			"<tr class='fc-first fc-last'><th class='fc-resourceName'>&nbsp;</th>";
		for (i=0; i<colCnt; i++) {
			s +=
				"<th class='fc- " + headerClass + "'/>";
		}
		s +=
			"</tr>" +
			"</thead>" +
			"<tbody>";
		for (i=0; i<maxRowCnt; i++) {
			id = resources[i]['id'];
			resourceName = resources[i]['name'];
			
			s +=
				"<tr class='fc-resourcerow-" + id + "'><td class='fc-resourceName'>" + resourceName + "</td>";
			for (j=0; j<colCnt; j++) {
				s +=
					"<td class='fc- " + contentClass + " fc-day" + j + " fc-resource" + id +"'>" + // need fc- for setDayID
					"<div>" +
					(showNumbers ?
						"<div class='fc-day-number'/>" :
						''
						) +
					"<div class='fc-day-content'>" +
					"<div style='position:relative'>&nbsp;</div>" +
					"</div>" +
					"</div>" +
					"</td>";
			}
			s +=
				"</tr>";
		}
		s +=
			"</tbody>" +
			"</table>";
		table = element.html($(s));
		
		head = table.find('thead');
		headCells = head.find('th:not(th.fc-resourceName)');
		body = table.find('tbody');
		bodyRows = body.find('tr');
		bodyCells = body.find('td:not(td.fc-resourceName)');
		bodyFirstCells = bodyRows.children().filter(':first-child');
		bodyCellTopInners = bodyRows.eq(0).find('div.fc-day-content div');
		
		// trigger resourceRender callback now when the skeleton is ready
		body.find('td.fc-resourceName').each(function(resourceElement) {
			trigger('resourceRender', resources[i], resources[i], resourceElement);
		});

		// marks first+last th's
		headCells
			.removeClass('fc-first fc-last')
			.filter(':first')
			.addClass('fc-first')
			.end()
			.filter(':last')
			.addClass('fc-last');
		
		// marks first+last td's from each row
		bodyCells.removeClass('fc-first fc-last');
		bodyRows.each(function() {
			$(this).children('td:not(td.fc-resourceName):first').addClass('fc-first');
			$(this).children('td:not(td.fc-resourceName):last').addClass('fc-last');
		});
		bodyRows.eq(0).addClass('fc-first'); // fc-last is done in updateCells
		
		dayBind(bodyCells);
		
		daySegmentContainer =
			$("<div style='position:absolute;z-index:8;top:0;left:0'/>")
				.appendTo(element);
	}
	
	
	
	function updateCells(firstTime) {
		var month = t.start.getMonth();
		var today = clearTime(new Date());
		var cell;
		var date;
		var row;
		var weekendTester;
		var indexCorrecter=0;
		var weekends = opt('weekends');
		headCells.each(function(i, _cell) {
			cell = $(_cell);
			date = indexDate(i);

			cell.html(formatDate(date, colFormat));
			if (date.getDay() == 0 || date.getDay() == 6) cell.addClass('fc-weekend');
			
			if (date.getDay() == 1 && viewName == "resourceNextWeeks") cell.html(cell.html()+'<br>'+opt('weekPrefix')+' '+iso8601Week(date));

			// setDayID does not work at all for resourceviews because there can be same id twice. Set date as timestamp works better
			cell.each(function(i, _cell) {
				_cell.className = _cell.className.replace(/^fc-\w*/, 'fc-id' + date.getTime());
			});
		});
		
		indexCorrecter=0;
		bodyCells.each(function(i, _cell) {
			cell = $(_cell);		
			date = indexDate(i);
			
			if (+date == +today) {
				cell.addClass(tm + '-state-highlight fc-today');
			}else{
				cell.removeClass(tm + '-state-highlight fc-today');
			}
			
			if (date.getDay() == 0 || date.getDay() == 6) cell.addClass('fc-weekend-column');
			
			cell.find('div.fc-day-number').text(date.getDate());
			
			cell.each(function(i, _cell) {
				_cell.className = _cell.className.replace(/^fc-\w*/, 'fc-id' + date.getTime());
			});
		});
		
		bodyRows.each(function(i, _row) {
			row = $(_row);
			if (i < rowCnt) {
				row.show();
				if (i == rowCnt-1) {
					row.addClass('fc-last');
				}else{
					row.removeClass('fc-last');
				}
			}else{
				row.hide();
			}
		});
	}
	
	
	
	function setHeight(height) {
		viewHeight = height;
		
		var bodyHeight = viewHeight - head.height();
		var rowHeight;
		var rowHeightLast;
		var cell;
			
		if (opt('weekMode') == 'variable') {
			rowHeight = rowHeightLast = Math.floor(bodyHeight / (rowCnt==1 ? 2 : 6));
		}else{
			rowHeight = Math.floor(bodyHeight / rowCnt);
			rowHeightLast = bodyHeight - rowHeight * (rowCnt-1);
		}
		
		bodyFirstCells.each(function(i, _cell) {
			if (i < rowCnt) {
				cell = $(_cell);
				setMinHeight(
					cell.find('> div'),
					(i==rowCnt-1 ? rowHeightLast : rowHeight) - vsides(cell)
				);
			}
		});
		
	}
	
	
	function setWidth(width) {
		viewWidth = width;
		// minus resourceName width
		viewWidth -= $('th.fc-resourceName').css('width').replace('px','');
		colContentPositions.clear();
		colWidth = Math.floor(viewWidth / colCnt);
		setOuterWidth(headCells.slice(0, -1), colWidth);
	}
	
	
	
	/* Day clicking and binding
	-----------------------------------------------------------*/
	
	
	function dayBind(days) {
		days.click(dayClick)
			.mousedown(daySelectionMousedown);
	}
	
	
	function dayClick(ev) {
		if (!opt('selectable')) { // if selectable, SelectionManager will worry about dayClick
			var index = parseInt(this.className.match(/fc\-day(\d+)/)[1]); // TODO: maybe use .data
			var date = indexDate(index);
			trigger('dayClick', this, date, true, ev);
		}
	}
	
	
	
	/* Semi-transparent Overlay Helpers
	------------------------------------------------------*/
	
	
	function renderDayOverlay(overlayStart, overlayEnd, refreshCoordinateGrid, overlayRow) { // overlayEnd is exclusive
		if (refreshCoordinateGrid) {
			coordinateGrid.build();
		}
		var rowStart = cloneDate(t.visStart);
		var rowEnd = addDays(cloneDate(rowStart), colCnt);

		if (viewName == 'resourceDay') {
			rowEnd = addMinutes(cloneDate(rowStart), opt('slotMinutes')*colCnt);
		}
		else if (!opt('weekends')) {
			rowEnd = cloneDate(t.visEnd);
		}

		var stretchStart = new Date(Math.max(rowStart, overlayStart));
		var stretchEnd = new Date(Math.min(rowEnd, overlayEnd));

		if (stretchStart < stretchEnd) {
			var colStart, colEnd;
			if (viewName == 'resourceDay') {
				colStart = (stretchStart-rowStart)/1000/60/opt('slotMinutes');
				colEnd = (stretchEnd-rowStart)/1000/60/opt('slotMinutes');
			}
			else {
				if (rtl) {
					colStart = dayDiff(stretchEnd, rowStart)*dis+dit+1;
					colEnd = dayDiff(stretchStart, rowStart)*dis+dit+1;
				}else{
					colStart = dayDiff(stretchStart, rowStart);
					colEnd = dayDiff(stretchEnd, rowStart);
				}
				
				if(!opt('weekends')) {
					// Drop weekends off
					var weekendSumColStart=0, weekendTestDate;				
					for(var i=0; i<=colStart; i++) {
						weekendTestDate = addDays(cloneDate(t.visStart), i);
						
						if(weekendTestDate.getDay() == 0 || weekendTestDate.getDay() == 6) {
							weekendSumColStart++;
						}
					}
					colStart -= weekendSumColStart;
					
					var weekendSumColEnd=0
					for(i=0; i<=colEnd-1; i++) {
						weekendTestDate = addDays(cloneDate(t.visStart), i);
						
						if(weekendTestDate.getDay() == 0 || weekendTestDate.getDay() == 6) {
							weekendSumColEnd++;
						}
					}
					colEnd -= weekendSumColEnd;
				}
			}
			
			dayBind(
				renderCellOverlay(overlayRow, colStart, overlayRow, colEnd-1)
			);
		}
	}
	
	
	function renderCellOverlay(row0, col0, row1, col1) { // row1,col1 is inclusive
		var rect = coordinateGrid.rect(row0, Math.round(col0), row1, Math.round(col1), element);
		return renderOverlay(rect, element);
	}
	
	
	
	/* Selection
	-----------------------------------------------------------------------*/
	
	
	function defaultSelectionEnd(startDate, allDay) {
		return cloneDate(startDate);
	}
	
	
	function renderSelection(startDate, endDate, allDay, overlayRow) {
		if (viewName == 'resourceDay') {
			renderDayOverlay(startDate, addMinutes(cloneDate(endDate), opt('slotMinutes')), true, overlayRow); // rebuild every time???
		}
		else {
			renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true, overlayRow); // rebuild every time???
		}
	}
	
	
	function clearSelection() {
		clearOverlays();
	}
	
	
	function reportDayClick(date, allDay, ev, resource) {
		var cell = dateCell(date);
		var _element = bodyCells[cell.col];
		trigger('dayClick', _element, date, allDay, ev, resource);
	}
	
	
	
	/* External Dragging
	-----------------------------------------------------------------------*/
	
	
	function dragStart(_dragElement, ev, ui) {
		hoverListener.start(function(cell) {
			clearOverlays();
			if (cell) {
				renderCellOverlay(cell.row, cell.col, cell.row, cell.col);
			}
		}, ev);
	}
	
	
	function dragStop(_dragElement, ev, ui) {
		var cell = hoverListener.stop();
		clearOverlays();
		if (cell) {
			var resources = t.getResources, newResource = resources[cell.row];
			var d = cellDate(cell);
			trigger('drop', _dragElement, d, true, ev, ui, newResource);
		}
	}
	
	
	
	/* Utilities
	--------------------------------------------------------*/
	
	
	function defaultEventEnd(event) {
		return cloneDate(event.start);
	}
	
	
	coordinateGrid = new CoordinateGrid(function(rows, cols) {
		var e, n, p;
		headCells.each(function(i, _e) {
			e = $(_e);
			n = e.offset().left;
			if (i) {
				p[1] = n;
			}
			p = [n];
			cols[i] = p;
		});
		p[1] = n + e.outerWidth();
		bodyRows.each(function(i, _e) {
			if (i < rowCnt) {
				e = $(_e);
				n = e.offset().top;
				if (i) {
					p[1] = n;
				}
				p = [n];
				rows[i] = p;
			}
		});

		p[1] = n + e.outerHeight();
	});
	
	
	hoverListener = new HoverListener(coordinateGrid);
	
	
	colContentPositions = new HorizontalPositionCache(function(col) {
		return bodyCellTopInners.eq(col);
	});
	
	
	function colContentLeft(col) {
		return colContentPositions.left(col);
	}
	
	
	function colContentRight(col) {
		return colContentPositions.right(col);
	}
	
	
	
	
	function dateCell(date) {
		var col,year,month,day,cmpDate,cmpYear,cmpMonth,cmpDay, weekends = opt('weekends');
		if (viewName == 'resourceDay') {
			col = timeOfDayCol(date);
		}
		else if (viewName == 'resourceNextWeeks') {
			// Start from first slot and test every date
			year = date.getFullYear();
			month = date.getMonth();
			day = date.getDate();

			for (var i=0; i < colCnt; i++) {
				cmpDate = _cellDate(i);
				cmpYear = cmpDate.getFullYear();
				cmpMonth = cmpDate.getMonth();
				cmpDay = cmpDate.getDate();
				
				if (year == cmpYear && month == cmpMonth && day == cmpDay) {
					col = i;
					break;
				}
				else if (cmpDate > date && !weekends) {
					// No weekends in the calendar, this must be the right column!
					col = i-1;
					break;
				}
			};
			
			if (typeof col == 'undefined') {
				// date is in next weekview, select last column
				col = i;
			}
		}
		else {
			col = dayOfWeekCol(date.getDay());
		}
		return { col: col };
	}
	
	
	function cellDate(cell) {
		return _cellDate(cell.col);
	}
	
	
	function _cellDate(col) {
		if (viewName == 'resourceDay') {
			return addMinutes(cloneDate(t.visStart), col*opt('slotMinutes'));
		}
		else {	
			if (!opt('weekends')) {
				// no weekends
				var dateTest, i;

				for (i=0; i <= col; i++) {
					dateTest = addDays(cloneDate(t.visStart), i);
					
					if (dateTest.getDay() == 6 || dateTest.getDay() == 0) {
						// this sunday or saturday
						col++;
					}
				}
			}

			return addDays(cloneDate(t.visStart), col, true);
		}
	}
	
	
	function indexDate(index) {
		return _cellDate(index%colCnt);
	}
	
	function dayOfWeekCol(dayOfWeek) {
		return ((dayOfWeek - Math.max(firstDay, nwe) + colCnt) % colCnt) * dis + dit;
	}
	
	function timeOfDayCol(datetime) {
		var hours = datetime.getHours();
		var minutes = datetime.getMinutes();
		var slotMinutes = opt('slotMinutes');
		var slot, diff, minDiff, closestMinute;
		
		// round minutes to closest minuteslot
		for ( var i = 0 ; i <= 60/slotMinutes; i++) {
			slot = i*slotMinutes;

			diff = Math.abs(slot-minutes);
			
			if (diff <= minDiff || i == 0) {
				minDiff = diff;
				closestMinute = slot;
			}
			
			if(closestMinute == 60) {
				hours++;
				closestMinute = 0;
			}
		}		
		minutes = closestMinute;


		
		for ( var i = 0; i < colCnt; i++) {
			if (indexDate(i).getHours() == hours && indexDate(i).getMinutes() == minutes) {
				return i;
			}
		}

		// not in range, return max
		return colCnt;
	}
	
	
	function allDayRow(i) {
		return bodyRows.eq(i);
	}
	
	
	function allDayBounds(i) {
		var resourceNameColWidth = parseInt($(head).find('th.fc-resourceName').css('width').replace('px',''));
		return {
			left: resourceNameColWidth,
			right: (viewWidth+resourceNameColWidth)
		};
	}
	
	function reportSelection(startDate, endDate, allDay, ev, resource) {
		if (typeof resource == 'object' && resource.readonly === true) {
			return false;
		}

		selected = true;
		trigger('select', null, startDate, endDate, allDay, ev, '', resource);
	}
	
	// Some changes from selectionManager daySelectionMousedown. Mainly because resourceDay view and resource readonly setting
	function daySelectionMousedown(ev) {
		var cellDate = t.cellDate;
		var cellIsAllDay = t.cellIsAllDay;
		var hoverListener = t.getHoverListener();
		var unselect = t.unselect;
		var reportDayClick = t.reportDayClick; // this is hacky and sort of weird
		var row;
		var resources = t.getResources || [];
		var resourceRO;
		
		if (ev.which == 1 && opt('selectable')) { // which==1 means left mouse button
			unselect(ev);
			var _mousedownElement = this;
			var dates;
			hoverListener.start(function(cell, origCell) { // TODO: maybe put cellDate/cellIsAllDay info in cell
				clearSelection();
				if (cell) {
					resourceRO = typeof resources[cell.row] == 'object' ? resources[cell.row].readonly : false;
				}

				if (cell && cellIsAllDay(cell) && resourceRO !== true) {
					dates = [ cellDate(origCell), cellDate(cell) ].sort(cmp);
					renderSelection(dates[0], dates[1], (viewName == 'resourceDay' ? false : true), cell.row);
					row = cell.row;
				}else{
					dates = null;
				}
			}, ev);
			$(document).one('mouseup', function(ev) {
				hoverListener.stop();
				if (dates) {
					if (+dates[0] == +dates[1]) {
						reportDayClick(dates[0],(viewName == 'resourceDay' ? false : true), ev, resources[row]);
					}
					reportSelection(dates[0], (viewName == 'resourceDay' ? addMinutes(dates[1], opt('slotMinutes')) : dates[1]), (viewName == 'resourceDay' ? false : true), ev, resources[row]);
				}
			});
		}
	}
	
	
}
