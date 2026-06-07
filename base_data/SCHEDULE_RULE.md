# 진료실 스케줄 편성 룰

DB에서 'employee_type', 'staff', 'schedule_setting' 테이블의 컬럼을 적절히 참고하여 스케줄을 작성한다.
근무 스케줄은 일주일 기준으로 5일 근무, 2일 휴무이며 휴무는 평일 1회, 주말 1회 를 기본으로 한다.

- is_weekday_fixed(staff) 가 true인 경우
  - 평일만 주 5일 근무
  - 그러나 평일에 공휴일이 있는 경우 주말 1일 대체 근무해야함.
- is_head_dentist_pick(staff) 가 true인 경우
  - 되도록이면 최대한 대표원장 (employee_type_id = 1) 의 스케줄과 맞춰서 근무를 배정해야함.
  - 만약 employee_type_id = 1의 진료날인데 휴무를 사용했다면 당연히 다른날에 근무를 배정하여 근무일을 채우면된다.
  - 평일 휴무는 여러 요일을 순환식으로 쉴수있도록 하되 employee_type_id = 1 이 휴무하는날에 is_head_dentist_pick가 true인 직원도 평일 휴무가 주어지는 경우가 많음.
- day_name(schedule_setting) 이 '일' 인 경우
  - 일요일의 경우 is_team_leader(staff)가 true인 인원이 최소 1명이상 근무해야한다.
  - is_weekday_fixed(staff)가 false인 경우는 일요일은 최대 월 2회까지만 배정이 가능하다.
- career(staff)가 '신규' 인 경우
  - 해당 인원은 주말(토,일) 중에서 '토' 만 근무배정이 가능하다. 일요일은 배정하지 않는다.
- career(staff)의 항목의 고려할 점
  - 해당 항목은 '고','중','저','신규' 로 이루어져있는데 특정 요일에 '중','저' 등등 저연차로만 배정이 되어서는 안된다.
  - 스케줄을 편성할 때 연차가 적절히 섞여야 한다.
- is_on_leave(staff)가 true인 경우
  - 해당 인원은 휴직으로서 스케줄 배정에서 제외한다.
- has_night_shift(schedule_setting) 가 true인 경우
  - 해당 요일의 경우 '주간','야간'을 각각 나누어서 배정해야하며 휴무인원을 제외하고 전체가 출근하도록 한다.
  - 또한 is_night_fixed(staff)가 true인 경우는 '야간'근무로 고정이되고 '주간'은 배정되지 않도록 한다.
- 교정과 진료인 경우 배정
  - 원장님(employee_type_id = 2)이 is_ortho(staff)가 true인 경우 해당 날짜 진료에는 진료실 인원 중 is_ortho가 true인 직원이 3명이상 포함되어야함.
