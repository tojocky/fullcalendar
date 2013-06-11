
fcViews.resourceMonth = ResourceMonthView;

function ResourceMonthView(element, calendar) {
	var t = this;
	
	
	// exports
	t.render = render;
	
	
	// imports
	ResourceView.call(t, element, calendar, 'resourceMonth');
	var opt = t.opt;
	var renderBasic = t.renderBasic;
	var formatDates = calendar.formatDates;
	var getResources = t.getResources;
	
	
	function render(date, delta) {
		if (delta) {
			addMonths(date, delta * 1);
			date.setDate(1);
		}
		var start = cloneDate(date, true);
		start.setDate(1);
		var end = addMonths(cloneDate(start), 1);
		var visStart = cloneDate(start);
		var visEnd = cloneDate(end);
		var weekends = opt('weekends');
		if (!weekends) {
			skipWeekend(visStart);
			skipWeekend(visEnd, -1, true);
		}

		t.title = formatDates(
			visStart,
			addDays(cloneDate(visEnd), -1),
			opt('titleFormat')
		);
		t.start = start;
		t.end = end;
		t.visStart = visStart;
		t.visEnd = visEnd;
		var cols = Math.round((visEnd - visStart) / (DAY_MS));
		var weekendTestDate;
		if(!weekends) {
			// Drop out weekends from cols
			var weekendCnt = 0;
			for(var i=1; i<=cols; i++) {
				weekendTestDate = addDays(cloneDate(visStart), i - 1);
				if(weekendTestDate.getDay() == 0 || weekendTestDate.getDay() == 6) {
					weekendCnt++;
				}
			}
			cols -= weekendCnt;
		}
		
		renderBasic(getResources.length, getResources.length, cols, false);
	}
	
	
}
