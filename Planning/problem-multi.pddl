;; problem file: problem-multi.pddl
(define (problem multi)
    (:domain default)
    (:requirements :action-costs)
    (:objects i f t1_1 t2_1 t3_1 t1_2 t2_2 t3_2 p1 p2)
    (:init  
        ;; My info 
        (me i) 
        (ally i)
        (not (carry i)) 
        (at i t1_1) 
        (at f t2_1)
        (not (carry f))
        (not (scored))
        
        ;; Map
        (tile t1_1) (tile t2_1) (tile t3_1)
        (tile t1_2) (tile t2_2) (tile t3_2)
        (right t1_1 t2_1) (right t2_1 t3_1) (right t1_2 t2_2) (right t2_2 t3_2)
        (left t2_1 t1_1) (left t3_1 t2_1) (left t2_2 t1_2) (left t3_2 t2_2)
        (up t1_1 t1_2) (up t2_1 t2_2) (up t3_1 t3_2)
        (down t1_2 t1_1) (down t2_2 t2_1) (down t3_2 t3_1)
        (delivery t3_1) 
        ;; spawn 
        (not (free t1_1)) (free t3_1)
        (not (free t2_1))
        (free t1_2) (free t2_2) (free t3_2)

        ;; Parcels
        (withparcel t1_1)

        ;; Other agents 
        (friend f)

        ; (= (total-cost) 0)s
    )

    (:goal ( scored ) )
    
    ; (:metric minimize (total-cost))
)
