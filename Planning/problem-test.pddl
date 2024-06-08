;; problem file: problem-first-9.pddl
(define (problem default)
    (:domain default)
    (:objects i
  f_b8181029558
  t0_17
  t0_0
  t0_1
  t0_2
  t0_3
  t0_4
  t0_5
  t0_6
  t0_7
  t0_8
  t0_9
  t0_10
  t0_11
  t0_12
  t0_13
  t0_14
  t0_15
  t0_16
  t0_18)
    (:init (me i) (ally i) (not (scored)) (friend f_b8181029558) (not (carry i)) (at i t0_17) (tile t0_0) (delivery t0_0) (free t0_0) (up t0_0 t0_1) (tile t0_1) (free t0_1) (up t0_1 t0_2) (down t0_1 t0_0) (tile t0_2) (free t0_2) (up t0_2 t0_3) (down t0_2 t0_1) (tile t0_3) (free t0_3) (up t0_3 t0_4) (down t0_3 t0_2) (tile t0_4) (free t0_4) (up t0_4 t0_5) (down t0_4 t0_3) (tile t0_5) (free t0_5) (up t0_5 t0_6) (down t0_5 t0_4) (tile t0_6) (free t0_6) (up t0_6 t0_7) (down t0_6 t0_5) (tile t0_7) (free t0_7) (up t0_7 t0_8) (down t0_7 t0_6) (tile t0_8) (free t0_8) (up t0_8 t0_9) (down t0_8 t0_7) (tile t0_9) (free t0_9) (up t0_9 t0_10) (down t0_9 t0_8) (tile t0_10) (free t0_10) (up t0_10 t0_11) (down t0_10 t0_9) (tile t0_11) (free t0_11) (up t0_11 t0_12) (down t0_11 t0_10) (tile t0_12) (free t0_12) (up t0_12 t0_13) (down t0_12 t0_11) (tile t0_13) (free t0_13) (up t0_13 t0_14) (down t0_13 t0_12) (tile t0_14) (free t0_14) (up t0_14 t0_15) (down t0_14 t0_13) (tile t0_15) (free t0_15) (up t0_15 t0_16) (down t0_15 t0_14) (tile t0_16) (free t0_16) (up t0_16 t0_17) (down t0_16 t0_15) (tile t0_17) (not (free t0_17)) (up t0_17 t0_18) (down t0_17 t0_16) (tile t0_18) (spawn t0_18) (not (free t0_18)) (down t0_18 t0_17) (at f_b8181029558 t0_18))
    (:goal (scored))
)
