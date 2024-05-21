;; problem file: problem-delivery.pddl
(define (problem default)
    (:domain default)
    (:objects i t1_1 t2_1 p1)
    (:init  
        (me i) (not (carry i)) (at i t1_1) 
        (tile t1_1) (tile t2_1)
        (delivery t2_1) 
        (parcel p1)
        ;; agents 
        (at p1 t1_1)
        (right t1_1 t2_1)
        (left t2_1 t1_1)
        ;; up 
        ;; down 
    )
    ;;(:goal (and (not (carry i)) (not (at p1 t1_1))))
    (:goal (and (not (at p1 t1_1)) ))
)
