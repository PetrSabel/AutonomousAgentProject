;; problem file: problem-delivery.pddl
(define (problem default)
    (:domain default)
    (:objects i t1_1 t2_1)
    (:init 
        ;; My info 
        (me i) 
        (not (carry i)) 
        (at i t1_1) 
        (not (scored i))

        ;; Map
        (tile t1_1) (tile t2_1)
        (right t1_1 t2_1)
        (left t2_1 t1_1)
        (delivery t2_1) 
        (not (free t1_1)) (free t2_1)
        ;; Parcels 
        (withparcel t1_1) 
    )

    (:goal (and (not (withparcel t1_1)) (scored i) ))
)
